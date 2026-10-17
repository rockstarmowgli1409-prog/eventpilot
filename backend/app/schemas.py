from datetime import date

from pydantic import BaseModel, Field


class Field_[T](BaseModel):  # noqa: N801 - generic wrapper: value + grounding
    value: T | None = None
    evidence: str | None = None  # exact quote from the email
    confidence: float = Field(0, ge=0, le=1)


class Cost(BaseModel):
    label: str  # e.g. "stage rental"
    amount_cad: float | None
    evidence: str | None = None


class Deadline(BaseModel):
    label: str  # e.g. "send insurance certificate"
    due: date | None
    evidence: str | None = None


class ActionItem(BaseModel):
    task: str
    owner: str | None  # "us" or "vendor" or a name
    due: date | None = None
    evidence: str | None = None


class Extraction(BaseModel):
    vendor_name: Field_[str]
    contact_email: Field_[str]
    event_name: Field_[str]
    event_date: Field_[date]
    costs: list[Cost]
    deadlines: list[Deadline]
    requirements: list[str]  # permits, insurance, power, setup
    action_items: list[ActionItem]
    open_questions: list[str]  # things the email left unclear


class RiskFlag(BaseModel):
    rule: str  # e.g. "deadline_in_past"
    severity: str  # "high" | "medium" | "low"
    message: str


class ExtractRequest(BaseModel):
    email_text: str = Field(min_length=1)
    event_id: int
    budget_cad: float | None = None
    prompt_version: str = "v2"


class ExtractResponse(BaseModel):
    id: int
    extraction: Extraction
    risks: list[RiskFlag]
    draft_reply: str
    meta: dict  # model, prompt_version, latency_ms, tokens, cost_usd


class EventCreate(BaseModel):
    name: str = Field(min_length=1)
    date: date
    budget_cad: float | None = None


class EventOut(EventCreate):
    id: int


class DraftUpdate(BaseModel):
    draft_reply: str


class TimelineEntry(BaseModel):
    date: date
    label: str
    kind: str  # "deadline" | "action" | "event"
    vendor: str | None = None
    extraction_id: int | None = None


class BoardCost(BaseModel):
    vendor: str | None
    label: str
    amount_cad: float | None
    extraction_id: int


class BoardResponse(BaseModel):
    event: EventOut
    timeline: list[TimelineEntry]
    costs: list[BoardCost]
    cost_total_cad: float
    budget_cad: float | None
    open_action_items: list[ActionItem]
    risks: list[RiskFlag]
