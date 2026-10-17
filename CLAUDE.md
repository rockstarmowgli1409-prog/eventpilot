# EventPilot

AI ops copilot: turns vendor/event emails into structured, evidence-backed plans.
Stack: FastAPI + Pydantic v2 + SQLAlchemy + PostgreSQL, React + Vite + TypeScript.

## Commands
- Backend tests: cd backend && .venv/bin/pytest -q
- Backend run: cd backend && .venv/bin/uvicorn app.main:app --reload
- Lint: cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .
- Frontend: cd frontend && npm run dev | npm run build | npm test
- DB: docker compose up -d db
- Eval: cd backend && .venv/bin/python -m evals.run_eval --prompt v1

## Rules
- schemas.py is the single source of truth for data shapes.
- Every extracted field must include `evidence` (exact quote from the email) and `confidence` 0-1.
- If a value is not in the email, return null. Never guess.
- Risk rules are plain Python, not LLM calls, and each has a unit test.
- Never auto-send email. Drafts are for human review.
- Never commit secrets. Read ANTHROPIC_API_KEY from env. Keep .env in .gitignore.
- Use type hints everywhere. Small functions. No dead code.
- Do not edit files in evals/cases/ (hand-labelled ground truth).
- Do not edit existing tests to make them pass. Fix the code.

## Definition of done for any task
1. Tests written first and pass. 2. ruff clean. 3. Short summary of what changed.
