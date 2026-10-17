from datetime import date

from app.drafts import draft_reply
from app.schemas import Cost, Deadline, Extraction, Field_, RiskFlag


def make(**overrides) -> Extraction:
    base = {
        "vendor_name": Field_[str](value="Harbour Tents", evidence="Harbour", confidence=0.9),
        "contact_email": Field_[str](),
        "event_name": Field_[str](),
        "event_date": Field_[date](),
        "costs": [Cost(label="tent", amount_cad=850)],
        "deadlines": [Deadline(label="deposit", due=date(2026, 10, 23))],
        "requirements": [],
        "action_items": [],
        "open_questions": ["Is power included?"],
    }
    base.update(overrides)
    return Extraction(**base)


def test_confirms_extracted_facts():
    text = draft_reply(make(), [])
    assert "Harbour Tents team" in text
    assert "$850.00 CAD" in text
    assert "October 23, 2026" in text
    assert "Is power included?" in text
    assert text.endswith("The Event Team")


def test_asks_about_missing_event_date_and_insurance():
    risks = [RiskFlag(rule="missing_insurance", severity="medium", message="x")]
    text = draft_reply(make(), risks)
    assert "confirm the date" in text
    assert "insurance documentation" in text


def test_does_not_invent_facts_when_extraction_is_empty():
    empty = make(vendor_name=Field_[str](), costs=[], deadlines=[], open_questions=[])
    text = draft_reply(empty, [])
    assert text.startswith("Hi there,")
    assert "$" not in text
