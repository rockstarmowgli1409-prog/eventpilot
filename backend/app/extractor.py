import time
from dataclasses import dataclass
from datetime import date
from typing import Protocol

import anthropic

from app.config import Settings, get_settings
from app.prompts import PROMPTS
from app.schemas import Extraction


class ExtractionError(Exception):
    pass


@dataclass
class ExtractionResult:
    extraction: Extraction
    meta: dict


class Extractor(Protocol):
    def __call__(
        self,
        email_text: str,
        *,
        event_name: str,
        event_date: date,
        reference_date: date,
        prompt_version: str,
    ) -> ExtractionResult: ...


def estimate_cost_usd(input_tokens: int, output_tokens: int, settings: Settings) -> float:
    return (
        input_tokens * settings.price_input_per_mtok
        + output_tokens * settings.price_output_per_mtok
    ) / 1_000_000


def build_user_message(
    email_text: str, event_name: str, event_date: date, reference_date: date
) -> str:
    return (
        f"Reference date (today): {reference_date.isoformat()}\n"
        f"Event: {event_name}, on {event_date.isoformat()}\n\n"
        f"<email>\n{email_text}\n</email>"
    )


def grounded(evidence: str | None, email_text: str) -> bool:
    return evidence is None or evidence in email_text


def count_evidence(extraction: Extraction, email_text: str) -> tuple[int, int]:
    """Return (quotes returned, quotes not found verbatim in the email)."""
    quotes = [
        getattr(extraction, n).evidence
        for n in ("vendor_name", "contact_email", "event_name", "event_date")
    ]
    quotes += [
        i.evidence for i in (*extraction.costs, *extraction.deadlines, *extraction.action_items)
    ]
    present = [q for q in quotes if q]
    return len(present), sum(1 for q in present if q not in email_text)


def enforce_grounding(extraction: Extraction, email_text: str) -> Extraction:
    """Drop any value whose evidence quote is not literally in the email."""
    for name in ("vendor_name", "contact_email", "event_name", "event_date"):
        f = getattr(extraction, name)
        if f.value is not None and (f.evidence is None or f.evidence not in email_text):
            f.value, f.evidence, f.confidence = None, None, 0
    for item in (*extraction.costs, *extraction.deadlines, *extraction.action_items):
        if not grounded(item.evidence, email_text):
            item.evidence = None
    return extraction


def extract_with_anthropic(
    email_text: str,
    *,
    event_name: str,
    event_date: date,
    reference_date: date,
    prompt_version: str,
    client: anthropic.Anthropic | None = None,
    settings: Settings | None = None,
) -> ExtractionResult:
    settings = settings or get_settings()
    if prompt_version not in PROMPTS:
        raise ExtractionError(f"Unknown prompt version '{prompt_version}'")
    client = client or anthropic.Anthropic(api_key=settings.anthropic_api_key)

    started = time.perf_counter()
    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=4096,
        system=PROMPTS[prompt_version],
        output_config={
            "format": {"type": "json_schema", "schema": anthropic.transform_schema(Extraction)}
        },
        messages=[
            {
                "role": "user",
                "content": build_user_message(email_text, event_name, event_date, reference_date),
            }
        ],
    )
    latency_ms = int((time.perf_counter() - started) * 1000)

    text = next((b.text for b in response.content if b.type == "text"), None)
    if text is None or response.stop_reason == "max_tokens":
        raise ExtractionError("Model did not return a complete JSON extraction")
    try:
        extraction = Extraction.model_validate_json(text)
    except ValueError as exc:
        raise ExtractionError(f"Model output did not match the schema: {exc}") from exc
    # Measured before enforcement so evals report how often the model fabricates quotes.
    evidence_total, evidence_ungrounded = count_evidence(extraction, email_text)
    extraction = enforce_grounding(extraction, email_text)

    usage = response.usage
    meta = {
        "model": settings.anthropic_model,
        "prompt_version": prompt_version,
        "latency_ms": latency_ms,
        "evidence_total": evidence_total,
        "evidence_ungrounded": evidence_ungrounded,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "cost_usd": estimate_cost_usd(usage.input_tokens, usage.output_tokens, settings),
    }
    return ExtractionResult(extraction=extraction, meta=meta)
