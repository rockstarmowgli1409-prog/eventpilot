const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Grounded<T> {
  value: T | null;
  evidence: string | null;
  confidence: number;
}
export interface Cost { label: string; amount_cad: number | null; evidence: string | null }
export interface Deadline { label: string; due: string | null; evidence: string | null }
export interface ActionItem { task: string; owner: string | null; due: string | null; evidence: string | null }
export interface Extraction {
  vendor_name: Grounded<string>;
  contact_email: Grounded<string>;
  event_name: Grounded<string>;
  event_date: Grounded<string>;
  costs: Cost[];
  deadlines: Deadline[];
  requirements: string[];
  action_items: ActionItem[];
  open_questions: string[];
}
export interface RiskFlag { rule: string; severity: "high" | "medium" | "low"; message: string }
export interface ExtractResponse {
  id: number;
  extraction: Extraction;
  risks: RiskFlag[];
  draft_reply: string;
  meta: { model: string; prompt_version: string; latency_ms: number; cost_usd: number };
}
export interface EventRecord { id: number; name: string; date: string; budget_cad: number | null }
export interface TimelineEntry {
  date: string; label: string; kind: "event" | "deadline" | "action"; vendor: string | null;
}
export interface Board {
  event: EventRecord;
  timeline: TimelineEntry[];
  costs: { vendor: string | null; label: string; amount_cad: number | null; extraction_id: number }[];
  cost_total_cad: number;
  budget_cad: number | null;
  open_action_items: ActionItem[];
  risks: RiskFlag[];
}
export interface EvalRun {
  prompt_version: string;
  timestamp: string;
  model: string;
  n_cases: number;
  n_errors: number;
  overall_score: number | null;
  scalars: Record<string, { accuracy: number | null; n: number }>;
  lists: Record<string, { precision: number; recall: number; f1: number }>;
  risk_accuracy: number | null;
  grounding_rate: number | null;
  latency_mean_ms: number | null;
  latency_p95_ms: number | null;
  total_cost_usd: number;
  cost_per_100_usd: number | null;
  by_difficulty?: Record<string, number | null>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("Cannot reach the API. Is the backend running?");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listEvents: () => request<EventRecord[]>("/api/events"),
  createEvent: (e: Omit<EventRecord, "id">) =>
    request<EventRecord>("/api/events", { method: "POST", body: JSON.stringify(e) }),
  extract: (body: { email_text: string; event_id: number; prompt_version: string }) =>
    request<ExtractResponse>("/api/extract", { method: "POST", body: JSON.stringify(body) }),
  board: (eventId: number) => request<Board>(`/api/events/${eventId}/board`),
  saveDraft: (id: number, draft_reply: string) =>
    request<ExtractResponse>(`/api/drafts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ draft_reply }),
    }),
  latestEvals: () => request<{ runs: Record<string, EvalRun> }>("/api/evals/latest"),
};
