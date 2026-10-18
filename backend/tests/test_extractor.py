import json
from datetime import date
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.extractor import (
    ExtractionError,
    extract_with_anthropic,
)

EMAIL = "Hi, Harbour Tents here. Tent and staff for $850. Deposit by Oct 23."


def fake_client(payload: dict | str | None, stop_reason: str = "end_turn"):
    if payload is None:
        blocks = []
    else:
        text = payload if isinstance(payload, str) else json.dumps(payload)
        blocks = [SimpleNamespace(type="text", text=text)]
    response = SimpleNamespace(
        content=blocks,
        stop_reason=stop_reason,
        usage=SimpleNamespace(input_tokens=1000, output_tokens=200),
    )
    return SimpleNamespace(messages=SimpleNamespace(create=lambda **_: response))


def payload(**overrides) -> dict:
    base = {
        "vendor_name": {"value": "Harbour Tents", "evidence": "Harbour Tents", "confidence": 0.9},
        "contact_email": {},
        "event_name": {},
        "event_date": {},
        "costs": [{"label": "tent and staff", "amount_cad": 850, "evidence": "$850"}],
        "deadlines": [{"label": "deposit", "due": "2026-10-23", "evidence": "Deposit by Oct 23"}],
        "requirements": [],
        "action_items": [],
        "open_questions": [],
    }
    base.update(overrides)
    return base


def run(client, version="v2"):
    return extract_with_anthropic(
        EMAIL,
        event_name="Night Market",
        event_date=date(2027, 3, 20),
        reference_date=date(2026, 10, 17),
        prompt_version=version,
        client=client,
        settings=Settings(anthropic_model="test-model"),
    )


def test_returns_validated_extraction_and_meta():
    result = run(fake_client(payload()))
    assert result.extraction.vendor_name.value == "Harbour Tents"
    assert result.meta["model"] == "test-model"
    assert result.meta["prompt_version"] == "v2"
    assert result.meta["input_tokens"] == 1000
    assert result.meta["cost_usd"] == pytest.approx(0.003 + 0.003)
    assert result.meta["latency_ms"] >= 0


def test_ungrounded_key_field_is_nulled():
    bad = payload(vendor_name={"value": "Ghost Co", "evidence": "Ghost Co said", "confidence": 0.9})
    result = run(fake_client(bad))
    assert result.extraction.vendor_name.value is None
    assert result.extraction.vendor_name.confidence == 0


def test_ungrounded_cost_evidence_is_dropped():
    bad = payload(costs=[{"label": "tent", "amount_cad": 850, "evidence": "made up quote"}])
    result = run(fake_client(bad))
    assert result.extraction.costs[0].evidence is None


def test_every_returned_evidence_is_in_the_email():
    e = run(fake_client(payload())).extraction
    quotes = [e.vendor_name.evidence, *(c.evidence for c in e.costs)]
    quotes += [d.evidence for d in e.deadlines]
    assert all(q in EMAIL for q in quotes if q)


def test_missing_tool_call_raises():
    with pytest.raises(ExtractionError):
        run(fake_client(None))


def test_unknown_prompt_version_raises():
    with pytest.raises(ExtractionError):
        run(fake_client(payload()), version="v9")


def test_meta_counts_ungrounded_quotes_before_they_are_dropped():
    bad = payload(costs=[{"label": "tent", "amount_cad": 850, "evidence": "made up quote"}])
    meta = run(fake_client(bad)).meta
    assert meta["evidence_ungrounded"] == 1
    assert meta["evidence_total"] == 3  # vendor, made-up cost quote, deadline


def test_truncated_or_invalid_json_raises():
    with pytest.raises(ExtractionError):
        run(fake_client(json.dumps(payload())[:40], stop_reason="max_tokens"))
    with pytest.raises(ExtractionError):
        run(fake_client("not json"))
