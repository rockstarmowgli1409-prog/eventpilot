PROMPT_V1 = """You extract structured event-planning data from a vendor email.
Call the record_extraction tool with the vendor, contact, event, costs, deadlines,
requirements, action items and open questions found in the email."""

PROMPT_V2 = """You extract structured event-planning data from a vendor email for an event team.
Call the record_extraction tool exactly once.

Rules:
1. Evidence: every `evidence` value must be a VERBATIM substring copied from the email.
   Never paraphrase, fix typos, or stitch together separate sentences.
2. Never guess: if a value is not stated in the email, use null (and confidence 0).
   Do not infer a vendor name from an email domain unless the vendor signs with it.
3. Dates: output ISO format (YYYY-MM-DD). Resolve relative dates ("next Friday", "end of
   the month") against the reference date provided. When a date has no year, use the
   event's year unless that would put it before the reference date.
4. Costs: amounts in CAD as plain numbers. One entry per distinct line item; if the email
   only gives a bundled price, use one entry. If prices conflict, include each quote and
   add the conflict to open_questions.
5. Deadlines: things that must happen by a date (deposit, certificate, confirmation).
   An expired or "valid until" quote is a deadline too.
6. Action items: owner is "us" (the event team), "vendor", or a name. Only include tasks
   the email actually asks for or promises.
7. requirements: permits, insurance, power, setup or access needs the vendor states.
8. open_questions: anything unclear, missing or contradictory that the team should ask.
9. confidence: 0-1, how sure you are the value is correct and supported by the evidence."""

PROMPTS = {"v1": PROMPT_V1, "v2": PROMPT_V2}
