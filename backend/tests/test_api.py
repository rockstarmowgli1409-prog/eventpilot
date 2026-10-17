from app.config import Settings, get_settings
from app.main import app
from tests.conftest import EMAIL


def make_event(client, budget=1000):
    res = client.post(
        "/api/events", json={"name": "Night Market", "date": "2099-03-20", "budget_cad": budget}
    )
    assert res.status_code == 201
    return res.json()["id"]


def extract(client, event_id, **extra):
    return client.post(
        "/api/extract",
        json={"email_text": EMAIL, "event_id": event_id, "prompt_version": "v2", **extra},
    )


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_extract_returns_extraction_risks_draft_and_meta(client):
    res = extract(client, make_event(client))
    assert res.status_code == 200
    body = res.json()
    assert body["extraction"]["vendor_name"]["value"] == "Harbour Tents"
    assert "missing_insurance" in {r["rule"] for r in body["risks"]}
    assert "Harbour Tents team" in body["draft_reply"]
    assert body["meta"]["prompt_version"] == "v2"


def test_over_budget_flagged_using_request_budget(client):
    body = extract(client, make_event(client, budget=5000), budget_cad=100).json()
    assert "over_budget" in {r["rule"] for r in body["risks"]}


def test_extract_unknown_event_is_404(client):
    assert extract(client, 999).status_code == 404


def test_extract_rejects_empty_email(client):
    res = client.post("/api/extract", json={"email_text": "", "event_id": 1})
    assert res.status_code == 422


def test_board_merges_extractions(client):
    event_id = make_event(client)
    extract(client, event_id)
    extract(client, event_id)
    board = client.get(f"/api/events/{event_id}/board").json()
    assert board["cost_total_cad"] == 1700
    assert board["budget_cad"] == 1000
    assert len(board["open_action_items"]) == 2
    dates = [t["date"] for t in board["timeline"]]
    assert dates == sorted(dates)
    assert {t["kind"] for t in board["timeline"]} == {"event", "deadline", "action"}


def test_board_unknown_event_is_404(client):
    assert client.get("/api/events/42/board").status_code == 404


def test_patch_draft_persists(client):
    extraction_id = extract(client, make_event(client)).json()["id"]
    res = client.patch(f"/api/drafts/{extraction_id}", json={"draft_reply": "Edited!"})
    assert res.json()["draft_reply"] == "Edited!"
    assert client.patch("/api/drafts/999", json={"draft_reply": "x"}).status_code == 404


def test_rate_limit(client):
    app.dependency_overrides[get_settings] = lambda: Settings(
        rate_limit_per_minute=2, daily_cost_cap_usd=100
    )
    event_id = make_event(client)
    assert extract(client, event_id).status_code == 200
    assert extract(client, event_id).status_code == 200
    assert extract(client, event_id).status_code == 429


def test_daily_cost_cap(client):
    app.dependency_overrides[get_settings] = lambda: Settings(
        daily_cost_cap_usd=0.015, rate_limit_per_minute=100
    )
    event_id = make_event(client)
    assert extract(client, event_id).status_code == 200
    assert extract(client, event_id).status_code == 200  # 0.01 spent, under 0.015
    res = extract(client, event_id)
    assert res.status_code == 503
    assert "daily usage limit" in res.json()["detail"]


def test_evals_latest_returns_runs_key(client):
    assert "runs" in client.get("/api/evals/latest").json()
