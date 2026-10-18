import type { Extraction } from "./api";

export type Tone = "field" | "cost" | "deadline" | "action";

export interface Quote {
  id: string;
  text: string;
  label: string;
  tone: Tone;
}

export interface Segment {
  text: string;
  quotes: Quote[];
}

export const TONE_CLASS: Record<Tone, string> = {
  field: "bg-indigo-100 text-indigo-950 dark:bg-indigo-400/25 dark:text-indigo-100",
  cost: "bg-emerald-100 text-emerald-950 dark:bg-emerald-400/25 dark:text-emerald-100",
  deadline: "bg-amber-100 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100",
  action: "bg-sky-100 text-sky-950 dark:bg-sky-400/25 dark:text-sky-100",
};

export const TONE_DOT: Record<Tone, string> = {
  field: "bg-indigo-500",
  cost: "bg-emerald-500",
  deadline: "bg-amber-500",
  action: "bg-sky-500",
};

/** Split the email into segments, each tagged with every quote that covers it. */
export function buildSegments(email: string, quotes: Quote[]): Segment[] {
  const ranges = quotes
    .filter((q) => q.text.length > 0)
    .map((q) => ({ q, start: email.indexOf(q.text) }))
    .filter((r) => r.start >= 0)
    .map((r) => ({ q: r.q, start: r.start, end: r.start + r.q.text.length }));

  const cuts = [...new Set([0, email.length, ...ranges.flatMap((r) => [r.start, r.end])])].sort(
    (a, b) => a - b,
  );
  const segments: Segment[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [from, to] = [cuts[i], cuts[i + 1]];
    if (from === to) continue;
    segments.push({
      text: email.slice(from, to),
      quotes: ranges.filter((r) => r.start <= from && r.end >= to).map((r) => r.q),
    });
  }
  return segments;
}

/** Every evidence quote in an extraction, with a stable id and a display label. */
export function collectQuotes(x: Extraction): Quote[] {
  const out: Quote[] = [];
  const push = (id: string, text: string | null, label: string, tone: Tone) => {
    if (text) out.push({ id, text, label, tone });
  };
  push("vendor_name", x.vendor_name.evidence, "Vendor", "field");
  push("contact_email", x.contact_email.evidence, "Contact email", "field");
  push("event_name", x.event_name.evidence, "Event name", "field");
  push("event_date", x.event_date.evidence, "Event date", "field");
  x.costs.forEach((c, i) => push(`cost:${i}`, c.evidence, `Cost: ${c.label}`, "cost"));
  x.deadlines.forEach((d, i) => push(`deadline:${i}`, d.evidence, `Deadline: ${d.label}`, "deadline"));
  x.action_items.forEach((a, i) => push(`action:${i}`, a.evidence, `To do: ${a.task}`, "action"));
  return out;
}
