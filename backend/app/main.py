from collections.abc import Callable
from contextlib import asynccontextmanager
from datetime import date

import anthropic
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import guards
from app.board import build_board
from app.config import Settings, get_settings
from app.db import Base, engine, get_db
from app.drafts import draft_reply
from app.evals_api import latest_results
from app.extractor import ExtractionError, ExtractionResult, extract_with_anthropic
from app.models import Event, ExtractionRecord
from app.risk import evaluate_risks
from app.schemas import (
    BoardResponse,
    DraftUpdate,
    EventCreate,
    EventOut,
    Extraction,
    ExtractRequest,
    ExtractResponse,
    RiskFlag,
)

ExtractFn = Callable[..., ExtractionResult]


@asynccontextmanager
async def lifespan(_: FastAPI):
    if str(engine.url).startswith("sqlite"):
        Base.metadata.create_all(engine)  # Postgres schemas are managed by Alembic
    yield


app = FastAPI(title="EventPilot", lifespan=lifespan)
_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_extractor() -> ExtractFn:
    return extract_with_anthropic


def _event_or_404(db: Session, event_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(404, "Event not found")
    return event


def _response(record: ExtractionRecord) -> ExtractResponse:
    return ExtractResponse(
        id=record.id,
        extraction=Extraction.model_validate(record.extraction),
        risks=[RiskFlag.model_validate(r) for r in record.risks],
        draft_reply=record.draft_reply,
        meta=record.meta,
    )


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/events", response_model=EventOut, status_code=201)
def create_event(body: EventCreate, db: Session = Depends(get_db)) -> Event:
    event = Event(name=body.name, date=body.date, budget_cad=body.budget_cad)
    db.add(event)
    db.commit()
    return event


@app.get("/api/events", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)) -> list[Event]:
    return list(db.scalars(select(Event).order_by(Event.id)))


@app.post("/api/extract", response_model=ExtractResponse)
def extract(
    body: ExtractRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    extractor: ExtractFn = Depends(get_extractor),
) -> ExtractResponse:
    guards.check_rate_limit(request, settings)
    guards.check_cost_cap(db, settings)
    event = _event_or_404(db, body.event_id)
    if extractor is extract_with_anthropic and not settings.anthropic_api_key:
        raise HTTPException(503, "The extraction service is not configured.")

    today = date.today()
    try:
        result = extractor(
            body.email_text,
            event_name=event.name,
            event_date=event.date,
            reference_date=today,
            prompt_version=body.prompt_version,
        )
    except ExtractionError as exc:
        raise HTTPException(422, str(exc)) from exc
    except anthropic.APIError as exc:
        raise HTTPException(502, "The AI service failed. Please try again.") from exc

    budget = body.budget_cad if body.budget_cad is not None else event.budget_cad
    risks = evaluate_risks(result.extraction, event.date, budget, today=today)
    record = ExtractionRecord(
        event_id=event.id,
        email_text=body.email_text,
        extraction=result.extraction.model_dump(mode="json"),
        risks=[r.model_dump() for r in risks],
        draft_reply=draft_reply(result.extraction, risks),
        meta=result.meta,
    )
    db.add(record)
    db.commit()
    return _response(record)


@app.get("/api/events/{event_id}/board", response_model=BoardResponse)
def board(event_id: int, db: Session = Depends(get_db)) -> BoardResponse:
    event = _event_or_404(db, event_id)
    records = list(
        db.scalars(
            select(ExtractionRecord)
            .where(ExtractionRecord.event_id == event_id)
            .order_by(ExtractionRecord.id)
        )
    )
    return build_board(event, records)


@app.patch("/api/drafts/{extraction_id}", response_model=ExtractResponse)
def update_draft(
    extraction_id: int, body: DraftUpdate, db: Session = Depends(get_db)
) -> ExtractResponse:
    record = db.get(ExtractionRecord, extraction_id)
    if record is None:
        raise HTTPException(404, "Extraction not found")
    record.draft_reply = body.draft_reply
    db.commit()
    return _response(record)


@app.get("/api/evals/latest")
def evals_latest() -> dict:
    return {"runs": latest_results()}
