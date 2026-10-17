# EventPilot

AI ops copilot that turns messy vendor emails into a structured, evidence-backed event plan.

Live demo: _not deployed yet_ · Demo video: _not recorded yet_

## The problem

Running campus events means dozens of vendor emails with prices, deadlines, and requirements buried in prose. Missing one deadline costs money or cancels an event. (I ran events as UVSS Director of Events.)

## What it does

1. Extracts vendor, costs, dates, requirements, and action items from an email.
2. Shows the exact quote behind every field, with a confidence score.
3. Flags risks using deterministic rules (past deadlines, over budget, missing insurance, date mismatch).
4. Drafts a reply for human approval. Nothing is sent automatically.
5. Merges everything into an event board (timeline, cost total vs budget, open action items, risks).

## How I know it works

The eval harness lives in `backend/evals/`. It runs the extractor over 30 labelled synthetic emails (10 easy, 10 messy, 10 traps) and scores each field:

- strings compare case-insensitively after trimming, dates compare exactly, money compares within 1 CAD
- list fields (costs, deadlines, action items, requirements) use precision/recall/F1 with fuzzy label matching
- risk flags are scored by running the real risk engine on the model's output and comparing to the labelled expected risks
- evidence grounding rate is measured on the model's raw output, **before** the pipeline drops any quote that is not literally in the email

**Results: not run yet.** No numbers are published here until they come from a real run. To produce them:

```bash
cd backend
cp ../.env.example .env        # add ANTHROPIC_API_KEY
.venv/bin/python -m evals.run_eval --prompt v1
.venv/bin/python -m evals.run_eval --prompt v2
```

Each run writes `backend/evals/results/{timestamp}_{prompt}.json` and the Evals page shows the latest run per prompt version. Commit the result files so the deployed dashboard has data.

| Metric | Prompt v1 | Prompt v2 |
|---|---|---|
| Vendor name accuracy | _fill from run_ | _fill from run_ |
| Date accuracy | _fill from run_ | _fill from run_ |
| Cost F1 | _fill from run_ | _fill from run_ |
| Deadline F1 | _fill from run_ | _fill from run_ |
| Evidence grounding rate | _fill from run_ | _fill from run_ |
| Mean / p95 latency | _fill from run_ | _fill from run_ |
| Cost per 100 emails (USD) | _fill from run_ | _fill from run_ |

**About the test set.** The 30 emails are synthetic, and so are the labels. Claude Code drafted both the emails and the answer key, and the answer key has not yet been independently reviewed by a human. Before quoting accuracy numbers anywhere, read the cases in `backend/evals/cases/` and correct any label you disagree with. Known label ambiguities: relative dates like "next Fri" (resolved against a fixed reference date of 2026-10-17), and whether an insurance mention counts as an action item for the `missing_insurance` rule (case 28 labels it as not).

Known failure modes: _to be filled in after the first real run._

Manual-vs-tool timing (10 emails): _not measured yet._

## Architecture

```
React (Vite, Tailwind)  ->  FastAPI  ->  Anthropic API (forced tool use, JSON schema from Pydantic)
                              |
                              +->  risk.py (plain Python rules)   +->  drafts.py (template, no LLM)
                              +->  PostgreSQL / SQLite (SQLAlchemy, Alembic)
evals/ (scoring.py, run_eval.py) -> results/*.json -> /api/evals/latest -> Evals page
```

## Decisions and tradeoffs

- **Structured output via forced tool use.** The model must call a tool whose input schema is generated from the Pydantic `Extraction` model, so failures are accuracy problems, not parsing problems.
- **Grounding is enforced in code.** Any value whose evidence quote is not a verbatim substring of the email is nulled. The raw ungrounded count is recorded separately so the eval can report it honestly.
- **Risk checks are code, not LLM calls:** deterministic, testable, and free. Each rule has unit tests.
- **Drafts are templated from the extraction, not LLM-written.** A draft can only mention facts that were extracted, and a human edits and copies it. Nothing is sent.
- **Demo guardrails:** per-IP rate limit (in-memory, single instance) and a daily cost cap computed from recorded usage.
- Cost figures are estimates from per-token prices in `config.py` (`PRICE_INPUT_PER_MTOK`, `PRICE_OUTPUT_PER_MTOK`). Check them against current pricing for the model you use.

## Run locally

```bash
# backend (Python 3.12+)
cd backend
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
cp ../.env.example .env                      # add ANTHROPIC_API_KEY
.venv/bin/uvicorn app.main:app --reload      # http://localhost:8000, SQLite by default

# frontend
cd frontend
cp .env.example .env
npm install && npm run dev                   # http://localhost:5173

# tests and lint
cd backend && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check .
cd frontend && npm test && npm run build

# Postgres instead of SQLite
docker compose up -d db
# set DATABASE_URL=postgresql+psycopg://eventpilot:eventpilot@localhost:5432/eventpilot in backend/.env
cd backend && .venv/bin/alembic upgrade head
```

The Alembic migration has been run against SQLite only. Run it against Postgres once before deploying.

## Deploy

- **API + Postgres:** Render blueprint in `render.yaml`. Set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL) in the dashboard. Set a hard monthly spend limit on your Anthropic account.
- **Frontend:** Vercel, root directory `frontend`, env var `VITE_API_URL` = the Render URL.
- Demo uses sample emails and pasted text only. It never connects to a real inbox.

## What I would build next

Gmail read-only integration, calendar export, vendor memory across events, multi-user auth.
