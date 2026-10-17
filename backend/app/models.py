from datetime import UTC, date, datetime

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date)
    budget_cad: Mapped[float | None] = mapped_column(Float, nullable=True)
    extractions: Mapped[list["ExtractionRecord"]] = relationship(back_populates="event")


class ExtractionRecord(Base):
    __tablename__ = "extractions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    email_text: Mapped[str] = mapped_column(Text)
    extraction: Mapped[dict] = mapped_column(JSON)
    risks: Mapped[list] = mapped_column(JSON)
    draft_reply: Mapped[str] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    event: Mapped[Event] = relationship(back_populates="extractions")
