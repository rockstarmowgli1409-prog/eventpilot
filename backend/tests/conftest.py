from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import guards
from app.config import Settings, get_settings
from app.db import Base, get_db
from app.extractor import ExtractionResult
from app.main import app, get_extractor
from app.schemas import ActionItem, Cost, Deadline, Extraction, Field_

EMAIL = (
    "Harbour Tents here. Tent and staff for $850. Deposit by Oct 23. Need insurance certificate."
)


def sample_extraction() -> Extraction:
    return Extraction(
        vendor_name=Field_[str](value="Harbour Tents", evidence="Harbour Tents", confidence=0.95),
        contact_email=Field_[str](),
        event_name=Field_[str](),
        event_date=Field_[date](),
        costs=[Cost(label="tent and staff", amount_cad=850, evidence="$850")],
        deadlines=[Deadline(label="deposit", due=date(2099, 10, 23), evidence="Deposit by Oct 23")],
        requirements=["insurance certificate"],
        action_items=[ActionItem(task="send deposit", owner="us", due=date(2099, 10, 23))],
        open_questions=[],
    )


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db():
        with session_factory() as session:
            yield session

    calls: list[dict] = []

    def fake_extractor(email_text, **kwargs):
        calls.append(kwargs)
        meta = {"model": "fake", "prompt_version": kwargs["prompt_version"], "cost_usd": 0.01}
        meta |= {"latency_ms": 5, "input_tokens": 1, "output_tokens": 1}
        return ExtractionResult(extraction=sample_extraction(), meta=meta)

    guards.rate_limiter.reset()
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_extractor] = lambda: fake_extractor
    app.dependency_overrides[get_settings] = lambda: Settings(daily_cost_cap_usd=1.0)
    with TestClient(app) as test_client:
        test_client.calls = calls
        yield test_client
    app.dependency_overrides.clear()
