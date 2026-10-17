import json
from datetime import date

from app.extractor import ExtractionResult
from app.schemas import ActionItem, Cost, Deadline, Extraction, Field_
from evals import CASES_DIR
from evals.run_eval import aggregate, load_cases, p95, run_cases, score_case, write_report


def perfect_for(case: dict) -> ExtractionResult:
    e = case["expected"]
    extraction = Extraction(
        vendor_name=Field_[str](value=e["vendor_name"], evidence=e["vendor_name"], confidence=1),
        contact_email=Field_[str](value=e.get("contact_email"), confidence=1),
        event_name=Field_[str](),
        event_date=Field_[date](value=e["event_date"], confidence=1),
        costs=[Cost(**c) for c in e["costs"]],
        deadlines=[Deadline(**d) for d in e["deadlines"]],
        requirements=e["requirements"],
        action_items=[ActionItem(**a) for a in e["action_items"]],
        open_questions=[],
    )
    meta = {
        "latency_ms": 100,
        "input_tokens": 10,
        "output_tokens": 5,
        "cost_usd": 0.01,
        "evidence_total": 2,
        "evidence_ungrounded": 0,
    }
    return ExtractionResult(extraction=extraction, meta=meta)


def oracle(email_text, **kwargs):
    case = next(c for c in load_cases() if c["email"] == email_text)
    return perfect_for(case)


def test_cases_directory_has_30_valid_labelled_cases():
    cases = load_cases(CASES_DIR)
    assert len(cases) == 30
    counts = {d: sum(c["difficulty"] == d for c in cases) for d in ("easy", "messy", "traps")}
    assert counts == {"easy": 10, "messy": 10, "traps": 10}
    assert len({c["id"] for c in cases}) == 30


def test_every_labelled_cost_and_vendor_appears_in_its_email():
    for case in load_cases():
        email = case["email"].lower()
        vendor = case["expected"]["vendor_name"]
        assert vendor is None or vendor.lower() in email, case["id"]
        for cost in case["expected"]["costs"]:
            amount = cost["amount_cad"]
            assert f"{amount:,.0f}" in case["email"] or f"{amount:.0f}" in case["email"], case["id"]


def test_perfect_extractor_scores_one_everywhere_except_risk_engine_quirks():
    cases = load_cases()
    report = aggregate("v2", "m", run_cases(cases, oracle, "v2"))
    assert report["n_errors"] == 0
    assert report["overall_score"] == 1.0
    assert report["risk_accuracy"] == 1.0  # labels agree with the real risk engine
    assert report["grounding_rate"] == 1.0
    assert report["lists"]["costs"]["f1"] == 1.0


def test_wrong_vendor_is_a_failure():
    case = load_cases()[0]
    result = perfect_for(case)
    result.extraction.vendor_name.value = "Someone Else"
    scored = score_case(case, result)
    assert scored["scalars"]["vendor_name"]["correct"] is False


def test_extractor_exception_is_recorded_not_raised():
    def boom(*_, **__):
        raise RuntimeError("api down")

    runs = run_cases(load_cases()[:2], boom, "v1")
    report = aggregate("v1", "m", runs)
    assert report["n_errors"] == 2
    assert report["overall_score"] is None


def test_p95_nearest_rank():
    assert p95(list(range(1, 101))) == 95
    assert p95([]) == 0.0


def test_write_report_names_file_by_timestamp_and_prompt(tmp_path):
    report = aggregate("v1", "m", run_cases(load_cases()[:1], oracle, "v1"))
    path = write_report(report, tmp_path)
    assert path.name.endswith("_v1.json")
    assert json.loads(path.read_text())["prompt_version"] == "v1"
