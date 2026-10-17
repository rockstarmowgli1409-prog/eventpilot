from datetime import date

from app.schemas import Extraction, RiskFlag

SIGNATURE = "Best regards,\nThe Event Team"


def _fmt_date(d: date) -> str:
    return f"{d:%B} {d.day}, {d.year}"


def _confirmed_lines(extraction: Extraction) -> list[str]:
    lines = [
        f"- {c.label}: ${c.amount_cad:,.2f} CAD"
        for c in extraction.costs
        if c.amount_cad is not None
    ]
    lines += [f"- {d.label}: by {_fmt_date(d.due)}" for d in extraction.deadlines if d.due]
    if extraction.event_date.value:
        lines.append(f"- Event date: {_fmt_date(extraction.event_date.value)}")
    return lines


def _questions(extraction: Extraction, risks: list[RiskFlag]) -> list[str]:
    questions = list(extraction.open_questions)
    if extraction.event_date.value is None:
        questions.append("Could you confirm the date you have us booked for?")
    if any(r.rule == "missing_insurance" for r in risks):
        questions.append("Could you tell us what insurance documentation you need, and by when?")
    if any(r.rule == "deadline_in_past" for r in risks):
        questions.append("Some of the dates mentioned have passed. Could you send updated ones?")
    return questions


def draft_reply(extraction: Extraction, risks: list[RiskFlag]) -> str:
    """Build a reply using only facts present in the extraction. Never sent automatically."""
    vendor = extraction.vendor_name.value
    parts = [f"Hi {vendor + ' team' if vendor else 'there'},", "", "Thanks for your email."]
    confirmed = _confirmed_lines(extraction)
    if confirmed:
        parts += ["Just confirming what we understand so far:", *confirmed]
    questions = _questions(extraction, risks)
    if questions:
        parts += ["", "A few things we would like to clarify:"]
        parts += [f"- {q}" for q in questions]
    parts += ["", "Looking forward to hearing from you.", "", SIGNATURE]
    return "\n".join(parts)
