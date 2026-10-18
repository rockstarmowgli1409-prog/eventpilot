# EventPilot

AI ops copilot that turns messy vendor emails into a structured, evidence-backed event plan.

Live demo: https://eventpilot-red.vercel.app · Demo video: _not recorded yet_

_Hosted on free tiers: the API sleeps when idle, so the first request can take up to a minute. The demo has a daily spend cap and uses synthetic emails only._

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

**Results** (2026-10-18, 30 synthetic cases, `claude-sonnet-5-5`, one run per prompt; two earlier full runs of v1 and v2 landed within about 1.5 points of these on overall score. Run-to-run noise is small but real, because this model does not accept a temperature setting):

| Metric | Prompt v1 | Prompt v2 | Prompt v3 |
|---|---|---|---|
| Overall score (mean per-case field score) | 75.8% | 92.5% | 95.1% |
| Vendor name accuracy | 100% | 100% | 100% |
| Event date accuracy | 96.7% | 96.7% | 100% |
| Cost F1 | 91.1% | 95.8% | 100% |
| Deadline F1 | 88.9% | 90.6% | 96.0% |
| Action item F1 | 0.0% | 82.1% | 88.0% |
| Requirements F1 | 66.7% | 85.7% | 83.3% |
| Risk flag accuracy | 90.0% | 90.0% | 93.3% |
| Evidence grounding rate (raw model output) | 93.2% | 100% | 100% |
| Mean / p95 latency | 4.0 s / 5.5 s | 5.0 s / 12.8 s | 5.2 s / 11.8 s |
| Cost per 100 emails (estimated USD) | $1.53 | $1.82 | $1.93 |

Raw results are in `backend/evals/results/`. Cost is estimated from the per-token prices in `config.py`, not read from a bill.

**How the prompts differ.** v1 is a one-line instruction. v2 adds rules: quote evidence verbatim, never guess, normalise dates, define who owns an action item. v3 is v2 plus two rules added **after reading v2's failures on this same 30-case set**: a deposit is part of the quoted price (not a separate cost), and a deadline needs a calendar date. Because v3 was tuned on the cases it is scored on, its numbers are optimistic. A fresh, unseen set would be the honest test.

**What reading the failures showed:**

- **v1 action items score 0.0** because v1 has no owner convention and writes the owner as a person's name ("Mohan") instead of "us". v2 defines the owners, which is most of the gap. That is a real prompt weakness, though it is also partly a consequence of how I labelled owners.
- **v1 fabricates quotes**: 6.8% of its evidence strings were not verbatim in the email. The pipeline nulls those, but the raw rate is what is reported. v2 and v3 had none in this run.
- **v2 double-counted deposits as separate costs** (cases 6, 9, 28), which inflates the total and could trigger a false `over_budget`. v3's deposit rule fixed this: cost F1 went to 100%.
- **v3 introduced a new false alarm (case 16):** told to turn dated terms into deadlines, it resolved "return is the Monday after" to 2027-02-15, which is after the event, so the `deadline_after_event` rule fired. Arguably the model is right that the return falls after the event, but the email is not a problem, so this counts as a false positive.
- **v3 requirements slipped slightly (85.7% to 83.3%)** because undated payment terms and logistics now land there, and the answer key lists few of them.
- **Remaining misses are mostly label ambiguity**, not model error: the model adds reasonable action items the key does not list (for example "arrange event insurance" in case 28, which is why `missing_insurance` was not flagged there).
- **One flaky date in v2:** in one run the model returned a null event date for case 30, which hid a `date_mismatch`; v3 got it right.
- **p95 latency (about 12 s)** is driven by a few slow calls.

**About the test set.** The 30 emails are synthetic, and so are the labels. Claude Code drafted both the emails and the answer key, and no human has independently reviewed the answer key. I did not edit the cases after seeing results. v1 and v2 were written before any results existed; v3 was not (see above). Read the cases in `backend/evals/cases/` and correct any label you disagree with before quoting these numbers. Other label ambiguities: relative dates like "next Fri" (resolved against a fixed reference date of 2026-10-17), and whether an insurance mention counts as an action item for the `missing_insurance` rule (case 28 labels it as not, and the model disagreed).

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
