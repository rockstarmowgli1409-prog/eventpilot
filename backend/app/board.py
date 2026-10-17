from app.models import Event, ExtractionRecord
from app.schemas import (
    ActionItem,
    BoardCost,
    BoardResponse,
    EventOut,
    Extraction,
    RiskFlag,
    TimelineEntry,
)


def _timeline(event: Event, records: list[ExtractionRecord]) -> list[TimelineEntry]:
    entries = [TimelineEntry(date=event.date, label=event.name, kind="event")]
    for record in records:
        e = Extraction.model_validate(record.extraction)
        vendor = e.vendor_name.value
        for d in e.deadlines:
            if d.due:
                entries.append(
                    TimelineEntry(
                        date=d.due,
                        label=d.label,
                        kind="deadline",
                        vendor=vendor,
                        extraction_id=record.id,
                    )
                )
        for a in e.action_items:
            if a.due:
                entries.append(
                    TimelineEntry(
                        date=a.due,
                        label=a.task,
                        kind="action",
                        vendor=vendor,
                        extraction_id=record.id,
                    )
                )
    return sorted(entries, key=lambda t: t.date)


def build_board(event: Event, records: list[ExtractionRecord]) -> BoardResponse:
    costs: list[BoardCost] = []
    actions: list[ActionItem] = []
    risks: list[RiskFlag] = []
    for record in records:
        e = Extraction.model_validate(record.extraction)
        costs += [
            BoardCost(
                vendor=e.vendor_name.value,
                label=c.label,
                amount_cad=c.amount_cad,
                extraction_id=record.id,
            )
            for c in e.costs
        ]
        actions += e.action_items
        risks += [RiskFlag.model_validate(r) for r in record.risks]
    return BoardResponse(
        event=EventOut(id=event.id, name=event.name, date=event.date, budget_cad=event.budget_cad),
        timeline=_timeline(event, records),
        costs=costs,
        cost_total_cad=sum(c.amount_cad or 0 for c in costs),
        budget_cad=event.budget_cad,
        open_action_items=actions,
        risks=risks,
    )
