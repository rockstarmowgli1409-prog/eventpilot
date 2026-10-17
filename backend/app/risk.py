from datetime import date

from app.schemas import Extraction, RiskFlag

LOW_CONFIDENCE_THRESHOLD = 0.6
INSURANCE_WORDS = ("insurance", "certificate")


def _mentions_insurance(text: str) -> bool:
    lowered = text.lower()
    return any(word in lowered for word in INSURANCE_WORDS)


def _deadline_risks(extraction: Extraction, event_date: date, today: date) -> list[RiskFlag]:
    risks: list[RiskFlag] = []
    for deadline in extraction.deadlines:
        if deadline.due is None:
            continue
        if deadline.due < today:
            risks.append(
                RiskFlag(
                    rule="deadline_in_past",
                    severity="high",
                    message=f"Deadline '{deadline.label}' ({deadline.due}) is already past.",
                )
            )
        if deadline.due > event_date:
            risks.append(
                RiskFlag(
                    rule="deadline_after_event",
                    severity="medium",
                    message=f"Deadline '{deadline.label}' ({deadline.due}) falls after the event.",
                )
            )
    return risks


def _budget_risk(extraction: Extraction, budget_cad: float | None) -> list[RiskFlag]:
    if budget_cad is None:
        return []
    total = sum(c.amount_cad or 0 for c in extraction.costs)
    if total <= budget_cad:
        return []
    return [
        RiskFlag(
            rule="over_budget",
            severity="high",
            message=f"Quoted costs ${total:,.2f} exceed the budget of ${budget_cad:,.2f}.",
        )
    ]


def _insurance_risk(extraction: Extraction) -> list[RiskFlag]:
    needs = any(_mentions_insurance(r) for r in extraction.requirements)
    handled = any(_mentions_insurance(a.task) for a in extraction.action_items)
    if needs and not handled:
        return [
            RiskFlag(
                rule="missing_insurance",
                severity="medium",
                message="Insurance/certificate is required but no action item covers it.",
            )
        ]
    return []


def _date_mismatch_risk(extraction: Extraction, event_date: date) -> list[RiskFlag]:
    found = extraction.event_date.value
    if found is None or found == event_date:
        return []
    return [
        RiskFlag(
            rule="date_mismatch",
            severity="high",
            message=f"Email says the event is on {found}, but the event record says {event_date}.",
        )
    ]


def _low_confidence_risks(extraction: Extraction) -> list[RiskFlag]:
    key_fields = {
        "vendor_name": extraction.vendor_name,
        "contact_email": extraction.contact_email,
        "event_name": extraction.event_name,
        "event_date": extraction.event_date,
    }
    return [
        RiskFlag(
            rule="low_confidence",
            severity="low",
            message=f"'{name}' has confidence {f.confidence:.2f}; please check it by hand.",
        )
        for name, f in key_fields.items()
        if f.value is not None and f.confidence < LOW_CONFIDENCE_THRESHOLD
    ]


def evaluate_risks(
    extraction: Extraction,
    event_date: date,
    budget_cad: float | None,
    today: date | None = None,
) -> list[RiskFlag]:
    today = today or date.today()
    return [
        *_deadline_risks(extraction, event_date, today),
        *_budget_risk(extraction, budget_cad),
        *_insurance_risk(extraction),
        *_date_mismatch_risk(extraction, event_date),
        *_low_confidence_risks(extraction),
    ]
