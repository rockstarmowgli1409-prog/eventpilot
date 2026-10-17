import pytest
from pydantic import ValidationError

from app.schemas import Extraction, Field_


def _empty() -> dict:
    return {
        "vendor_name": {"value": "Harbour Tents", "evidence": "Harbour Tents", "confidence": 0.9},
        "contact_email": {},
        "event_name": {},
        "event_date": {"value": "2027-03-20", "evidence": "March 20", "confidence": 0.8},
        "costs": [],
        "deadlines": [],
        "requirements": [],
        "action_items": [],
        "open_questions": [],
    }


def test_extraction_parses_and_coerces_dates():
    e = Extraction.model_validate(_empty())
    assert e.event_date.value.isoformat() == "2027-03-20"
    assert e.contact_email.value is None


def test_confidence_must_be_between_0_and_1():
    with pytest.raises(ValidationError):
        Field_[str](value="x", confidence=1.5)


def test_json_schema_is_exportable_for_tool_use():
    schema = Extraction.model_json_schema()
    assert "vendor_name" in schema["properties"]
