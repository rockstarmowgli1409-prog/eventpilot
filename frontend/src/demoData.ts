import type { ExtractResponse } from "./api";

// Real output captured from one run of prompt v2 (claude-sonnet-5-5) on a synthetic email,
// so the landing page can show the product without needing the API.
export const DEMO_EMAIL: string =
  "Hi Mohan,\n\nTillicum Lighting following up on the lighting quote I sent in September: truss lighting rig for April 10, 2027 at $3,400. As a reminder, that quote expired on October 1, 2026, and prices have gone up 8% since, so a new quote would be $3,672. Please confirm by October 14 if you want the old price.\n\nThanks,\nRosa\nTillicum Lighting";

export const DEMO_EVENT = {"name": "Spring Concert", "date": "2027-04-10", "budget_cad": 15000} as const;

export const DEMO_RESULT: Omit<ExtractResponse, "id"> = {
  "extraction": {
    "vendor_name": {
      "value": "Tillicum Lighting",
      "evidence": "Tillicum Lighting",
      "confidence": 0.95
    },
    "contact_email": {
      "value": null,
      "evidence": null,
      "confidence": 0.0
    },
    "event_name": {
      "value": null,
      "evidence": null,
      "confidence": 0.0
    },
    "event_date": {
      "value": "2027-04-10",
      "evidence": "April 10, 2027",
      "confidence": 0.9
    },
    "costs": [
      {
        "label": "Truss lighting rig - original quote (expired)",
        "amount_cad": 3400.0,
        "evidence": "truss lighting rig for April 10, 2027 at $3,400"
      },
      {
        "label": "Truss lighting rig - new quote (8% increase)",
        "amount_cad": 3672.0,
        "evidence": "a new quote would be $3,672"
      }
    ],
    "deadlines": [
      {
        "label": "Original quote expired",
        "due": "2026-10-01",
        "evidence": "that quote expired on October 1, 2026"
      },
      {
        "label": "Confirm by this date to get the old price",
        "due": "2026-10-14",
        "evidence": "Please confirm by October 14 if you want the old price."
      }
    ],
    "requirements": [],
    "action_items": [
      {
        "task": "Confirm whether we want the old price of $3,400 for the truss lighting rig",
        "owner": "us",
        "due": "2026-10-14",
        "evidence": "Please confirm by October 14 if you want the old price."
      }
    ],
    "open_questions": [
      "The original quote expired on October 1, 2026 and the October 14 confirmation date has already passed (today is 2026-10-17). Will Tillicum Lighting still honour the $3,400 price?",
      "Two prices were quoted ($3,400 old, $3,672 new). Which price applies?",
      "What is Rosa's contact email address?",
      "Does the quote cover setup, teardown, power or insurance needs?"
    ]
  },
  "risks": [
    {
      "rule": "deadline_in_past",
      "severity": "high",
      "message": "Deadline 'Original quote expired' (2026-10-01) is already past."
    },
    {
      "rule": "deadline_in_past",
      "severity": "high",
      "message": "Deadline 'Confirm by this date to get the old price' (2026-10-14) is already past."
    }
  ],
  "draft_reply": "Hi Tillicum Lighting team,\n\nThanks for your email.\nJust confirming what we understand so far:\n- Truss lighting rig - original quote (expired): $3,400.00 CAD\n- Truss lighting rig - new quote (8% increase): $3,672.00 CAD\n- Original quote expired: by October 1, 2026\n- Confirm by this date to get the old price: by October 14, 2026\n- Event date: April 10, 2027\n\nA few things we would like to clarify:\n- The original quote expired on October 1, 2026 and the October 14 confirmation date has already passed (today is 2026-10-17). Will Tillicum Lighting still honour the $3,400 price?\n- Two prices were quoted ($3,400 old, $3,672 new). Which price applies?\n- What is Rosa's contact email address?\n- Does the quote cover setup, teardown, power or insurance needs?\n- Some of the dates mentioned have passed. Could you send updated ones?\n\nLooking forward to hearing from you.\n\nBest regards,\nThe Event Team",
  "meta": {
    "model": "claude-sonnet-5-5",
    "prompt_version": "v2",
    "latency_ms": 10214,
    "cost_usd": 0.027669
  }
};
