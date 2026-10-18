"""Score the extractor against the labelled cases.

Usage: python -m evals.run_eval --prompt v1
Needs ANTHROPIC_API_KEY. Writes evals/results/{timestamp}_{prompt}.json.
"""

import argparse
import json
import math
import sys
from collections.abc import Callable
from datetime import UTC, date, datetime
from pathlib import Path
from statistics import mean

from app.config import get_settings
from app.extractor import ExtractionResult, extract_with_anthropic
from app.risk import evaluate_risks
from evals import CASES_DIR, RESULTS_DIR
from evals.scoring import (
    ListScore,
    match_date,
    match_string,
    score_actions,
    score_costs,
    score_deadlines,
    score_list_of_strings,
)

SCALAR_FIELDS = ("vendor_name", "event_date", "contact_email")
LIST_SCORERS = {
    "costs": score_costs,
    "deadlines": score_deadlines,
    "action_items": score_actions,
    "requirements": score_list_of_strings,
}
# low_confidence depends on the model's own scores, not on the email, so it has no label.
UNLABELLED_RULES = {"low_confidence"}

ExtractFn = Callable[..., ExtractionResult]


def load_cases(cases_dir: Path = CASES_DIR) -> list[dict]:
    return [json.loads(p.read_text()) for p in sorted(cases_dir.glob("*.json"))]


def p95(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[max(0, math.ceil(0.95 * len(ordered)) - 1)] if ordered else 0.0


def _scalar_match(field: str, expected, predicted) -> bool:
    return (match_date if field == "event_date" else match_string)(expected, predicted)


def score_case(case: dict, result: ExtractionResult) -> dict:
    """Return per-field results for one case. Pure: no network."""
    expected, extraction = case["expected"], result.extraction
    scalars = {}
    for field in SCALAR_FIELDS:
        if field not in expected:
            continue
        predicted = getattr(extraction, field).value
        shown = predicted.isoformat() if isinstance(predicted, date) else predicted
        scalars[field] = {
            "correct": _scalar_match(field, expected[field], predicted),
            "expected": expected[field],
            "got": shown,
        }
    lists = {}
    for field, scorer in LIST_SCORERS.items():
        predicted = [
            i.model_dump(mode="json") if hasattr(i, "model_dump") else i
            for i in getattr(extraction, field)
        ]
        score: ListScore = scorer(expected[field], predicted)
        lists[field] = {
            "tp": score.tp,
            "fp": score.fp,
            "fn": score.fn,
            "f1": score.f1,
            "got": predicted,
        }
    risks = evaluate_risks(
        extraction,
        date.fromisoformat(case["event"]["date"]),
        case["event"]["budget_cad"],
        today=date.fromisoformat(case["reference_date"]),
    )
    got_rules = {r.rule for r in risks} - UNLABELLED_RULES
    return {
        "scalars": scalars,
        "lists": lists,
        "risks": {
            "correct": got_rules == set(expected["expected_risks"]),
            "got": sorted(got_rules),
        },
    }


def case_score(scored: dict) -> float:
    parts = [float(s["correct"]) for s in scored["scalars"].values()]
    parts += [item["f1"] for item in scored["lists"].values()]
    return mean(parts)


def _failures(case: dict, scored: dict) -> list[dict]:
    out = [
        {"case": case["id"], "field": f, "expected": s["expected"], "got": s["got"]}
        for f, s in scored["scalars"].items()
        if not s["correct"]
    ]
    out += [
        {"case": case["id"], "field": f, "expected": case["expected"][f], "got": item["got"]}
        for f, item in scored["lists"].items()
        if item["f1"] < 1
    ]
    if not scored["risks"]["correct"]:
        out.append(
            {
                "case": case["id"],
                "field": "risks",
                "expected": case["expected"]["expected_risks"],
                "got": scored["risks"]["got"],
            }
        )
    return out


def aggregate(prompt_version: str, model: str, runs: list[dict]) -> dict:
    """runs: [{case, scored|None, meta|None, error|None}] -> report dict."""
    ok = [r for r in runs if r["scored"] is not None]
    if not ok:
        raise ValueError("No case produced a result; refusing to build a report.")
    scalars = {}
    for field in SCALAR_FIELDS:
        hits = [
            r["scored"]["scalars"][field]["correct"] for r in ok if field in r["scored"]["scalars"]
        ]
        scalars[field] = {"accuracy": mean(hits) if hits else None, "n": len(hits)}
    lists = {}
    for field in LIST_SCORERS:
        total = ListScore(
            tp=sum(r["scored"]["lists"][field]["tp"] for r in ok),
            fp=sum(r["scored"]["lists"][field]["fp"] for r in ok),
            fn=sum(r["scored"]["lists"][field]["fn"] for r in ok),
        )
        lists[field] = {"precision": total.precision, "recall": total.recall, "f1": total.f1}
    metas = [r["meta"] for r in ok]
    evidence_total = sum(m["evidence_total"] for m in metas)
    evidence_bad = sum(m["evidence_ungrounded"] for m in metas)
    latencies = [m["latency_ms"] for m in metas]
    cost = sum(m["cost_usd"] for m in metas)
    by_difficulty = {}
    for diff in ("easy", "messy", "traps"):
        scores = [case_score(r["scored"]) for r in ok if r["case"]["difficulty"] == diff]
        by_difficulty[diff] = mean(scores) if scores else None
    overall = [case_score(r["scored"]) for r in ok]
    return {
        "prompt_version": prompt_version,
        "timestamp": datetime.now(UTC).isoformat(timespec="seconds"),
        "model": model,
        "n_cases": len(runs),
        "n_errors": len(runs) - len(ok),
        "overall_score": mean(overall) if overall else None,
        "scalars": scalars,
        "lists": lists,
        "risk_accuracy": mean(r["scored"]["risks"]["correct"] for r in ok) if ok else None,
        "grounding_rate": 1 - evidence_bad / evidence_total if evidence_total else None,
        "latency_mean_ms": mean(latencies) if latencies else None,
        "latency_p95_ms": p95(latencies),
        "total_tokens": sum(m["input_tokens"] + m["output_tokens"] for m in metas),
        "total_cost_usd": cost,
        "cost_per_100_usd": cost / len(ok) * 100 if ok else None,
        "by_difficulty": by_difficulty,
        "failures": [f for r in ok for f in _failures(r["case"], r["scored"])],
        "errors": [{"case": r["case"]["id"], "error": r["error"]} for r in runs if r["error"]],
    }


def run_cases(cases: list[dict], extractor: ExtractFn, prompt_version: str) -> list[dict]:
    runs = []
    for case in cases:
        try:
            result = extractor(
                case["email"],
                event_name=case["event"]["name"],
                event_date=date.fromisoformat(case["event"]["date"]),
                reference_date=date.fromisoformat(case["reference_date"]),
                prompt_version=prompt_version,
            )
            runs.append(
                {
                    "case": case,
                    "scored": score_case(case, result),
                    "meta": result.meta,
                    "error": None,
                }
            )
        except Exception as exc:  # one bad case must not abort a paid run
            runs.append({"case": case, "scored": None, "meta": None, "error": repr(exc)})
        print(f"  {case['id']}: {'error' if runs[-1]['error'] else 'ok'}", file=sys.stderr)
    return runs


def write_report(report: dict, results_dir: Path = RESULTS_DIR) -> Path:
    results_dir.mkdir(exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = results_dir / f"{stamp}_{report['prompt_version']}.json"
    path.write_text(json.dumps(report, indent=2) + "\n")
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", default="v1", choices=["v1", "v2", "v3"])
    parser.add_argument("--limit", type=int, default=None, help="only run the first N cases")
    args = parser.parse_args(argv)

    settings = get_settings()
    if not settings.anthropic_api_key:
        print("ANTHROPIC_API_KEY is not set (put it in backend/.env).", file=sys.stderr)
        return 1
    cases = load_cases()[: args.limit]
    print(f"Running {len(cases)} cases with prompt {args.prompt} on {settings.anthropic_model}")
    runs = run_cases(cases, extract_with_anthropic, args.prompt)
    if all(r["error"] for r in runs):
        print(
            f"Every case failed, nothing written. First error: {runs[0]['error']}", file=sys.stderr
        )
        return 1
    report = aggregate(args.prompt, settings.anthropic_model, runs)
    path = write_report(report)
    print(f"Wrote {path}")
    print(json.dumps({k: v for k, v in report.items() if k != "failures"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
