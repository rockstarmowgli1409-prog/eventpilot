from datetime import date

from app.risk import evaluate_risks
from app.schemas import ActionItem, Cost, Deadline, Extraction, Field_

TODAY = date(2026, 10, 17)
EVENT_DATE = date(2027, 3, 20)


def make(**overrides) -> Extraction:
    base = {
        "vendor_name": Field_[str](value="Harbour Tents", evidence="Harbour", confidence=0.9),
        "contact_email": Field_[str](value="a@b.ca", evidence="a@b.ca", confidence=0.9),
        "event_name": Field_[str](value="Night Market", evidence="Night Market", confidence=0.9),
        "event_date": Field_[date](value=EVENT_DATE, evidence="March 20", confidence=0.9),
        "costs": [],
        "deadlines": [],
        "requirements": [],
        "action_items": [],
        "open_questions": [],
    }
    base.update(overrides)
    return Extraction(**base)


def rules(extraction: Extraction, budget: float | None = None) -> set[str]:
    risks = evaluate_risks(extraction, EVENT_DATE, budget, today=TODAY)
    return {r.rule for r in risks}


def test_clean_extraction_has_no_risks():
    assert rules(make()) == set()


def test_deadline_in_past():
    e = make(deadlines=[Deadline(label="deposit", due=date(2026, 10, 1))])
    assert "deadline_in_past" in rules(e)


def test_deadline_today_is_not_past():
    e = make(deadlines=[Deadline(label="deposit", due=TODAY)])
    assert "deadline_in_past" not in rules(e)


def test_deadline_after_event():
    e = make(deadlines=[Deadline(label="final payment", due=date(2027, 4, 1))])
    assert "deadline_after_event" in rules(e)


def test_deadline_with_no_date_is_ignored():
    e = make(deadlines=[Deadline(label="tbd", due=None)])
    assert rules(e) == set()


def test_over_budget():
    e = make(costs=[Cost(label="tent", amount_cad=800), Cost(label="staff", amount_cad=500)])
    assert "over_budget" in rules(e, budget=1000)


def test_within_budget_and_unknown_budget():
    e = make(costs=[Cost(label="tent", amount_cad=800)])
    assert "over_budget" not in rules(e, budget=1000)
    assert "over_budget" not in rules(e, budget=None)


def test_missing_insurance():
    e = make(requirements=["Certificate of insurance required"])
    assert "missing_insurance" in rules(e)


def test_insurance_covered_by_action_item():
    e = make(
        requirements=["Certificate of insurance required"],
        action_items=[ActionItem(task="Send insurance certificate", owner="us")],
    )
    assert "missing_insurance" not in rules(e)


def test_date_mismatch():
    e = make(event_date=Field_[date](value=date(2027, 3, 27), evidence="Mar 27", confidence=0.9))
    assert "date_mismatch" in rules(e)


def test_no_date_mismatch_when_email_has_no_date():
    e = make(event_date=Field_[date]())
    assert "date_mismatch" not in rules(e)


def test_low_confidence_flags_key_field():
    e = make(vendor_name=Field_[str](value="Harbour?", evidence="Harbour", confidence=0.4))
    assert "low_confidence" in rules(e)


def test_null_field_is_not_low_confidence():
    e = make(contact_email=Field_[str]())
    assert "low_confidence" not in rules(e)
