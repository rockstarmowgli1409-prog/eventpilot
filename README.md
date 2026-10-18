# EventPilot

AI ops copilot that turns messy vendor emails into a structured, evidence-backed event plan.

Live demo: _not deployed yet_ · Demo video: _not recorded yet_

## The problem

Running campus events means dozens of vendor emails with prices, deadlines, and requirements buried in prose. Missing one deadline costs money or cancels an event. (I ran events as UVSS Director of Events.)

## What it does

The app has a landing page with a real example run, an Inbox that links each extracted fact to its highlighted source sentence, a per-event Board, and an Evals dashboard, with light and dark themes.

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

**Results** (2026-10-18, 30 synthetic cases, `claude-sonnet-5-5`, one run per prompt; two earlier full runs landed within about 1.5 points on overall score, so run-to-run noise is small but real because this model does not accept a temperature setting):

| Metric | Prompt v1 | Prompt v2 |
|---|---|---|
| Overall score (mean per-case field score) | 75.8% | 92.5% |
| Vendor name accuracy | 100% | 100% |
| Event date accuracy | 96.7% | 96.7% |
| Cost F1 | 91.1% | 95.8% |
| Deadline F1 | 88.9% | 90.6% |
| Action item F1 | 0.0% | 82.1% |
| Requirements F1 | 66.7% | 85.7% |
| Risk flag accuracy | 90.0% | 90.0% |
| Evidence grounding rate (raw model output) | 93.2% | 100% |
| Mean / p95 latency | 4.0 s / 5.5 s | 5.0 s / 12.8 s |
| Cost per 100 emails (estimated USD) | $1.53 | $1.82 |

Raw results are in `backend/evals/results/`. Cost is estimated from the per-token prices in `config.py`, not read from a bill.

**Known failure modes (from reading the failures):**

- **v1 action items score 0.0** because v1 has no owner convention and writes the owner as a person's name ("Mohan") instead of "us". v2's prompt defines the owners, which is most of the gap. That is a real prompt weakness, though it is also partly a consequence of how I labelled owners.
- **v1 fabricates quotes**: 6.8% of its evidence strings were not verbatim in the email. The pipeline nulls those, but the raw rate is what is reported. v2 had none in this run.
- **v2 double-counts deposits as separate costs** (cases 6, 9, 28). A deposit is usually part of the quoted price, so this inflates totals and could trigger a false `over_budget`. Not fixed yet.
- **v2 turns payment terms with no date into deadlines or requirements** and adds extra, often reasonable, action items that the answer key does not list. Part of the remaining gap is incomplete labels, not model error.
- **One flaky date**: in one run the model returned a null event date for case 30 (April 24 vs the event record's April 10), which hid a `date_mismatch`; a re-run returned it correctly.
- **p95 latency for v2 (12.8 s)** is driven by a few slow calls.

**About the test set.** The 30 emails are synthetic, and so are the labels. Claude Code drafted both the emails and the answer key, and no human has independently reviewed the answer key. I did not edit the cases after seeing results, and I did not tune v2 against them, so v2 is the first draft of that prompt. Still, read the cases in `backend/evals/cases/` and correct any label you disagree with before quoting these numbers. Other label ambiguities: relative dates like "next Fri" (resolved against a fixed reference date of 2026-10-17), and whether an insurance mention counts as an action item for the `missing_insurance` rule (case 28 labels it as not, and the model disagreed).

Manual-vs-tool timing (10 emails): _not measured yet._

## Architecture

```
React (Vite, Tailwind)  ->  FastAPI  ->  Anthropic API (structured JSON output, schema from Pydantic)
                              |
                              +->  risk.py (plain Python rules)   +->  drafts.py (template, no LLM)
                              +->  PostgreSQL / SQLite (SQLAlchemy, Alembic)
evals/ (scoring.py, run_eval.py) -> results/*.json -> /api/evals/latest -> Evals page
```

## Decisions and tradeoffs

- **Structured output.** The response is constrained to a JSON schema generated from the Pydantic `Extraction` model (the model rejects forced tool use, so this uses `output_config`), so failures are accuracy problems, not parsing problems.
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
