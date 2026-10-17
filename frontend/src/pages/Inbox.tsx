import { useState } from "react";
import { api, type ExtractResponse } from "../api";
import DraftEditor from "../components/DraftEditor";
import EventPicker from "../components/EventPicker";
import FieldCard from "../components/FieldCard";
import RiskBadge from "../components/RiskBadge";
import { money } from "../format";
import { useEvents } from "../hooks";
import { SAMPLES } from "../samples";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Quote({ text }: { text: string | null }) {
  return text ? <mark className="mt-1 block rounded bg-yellow-100 px-1 text-xs">{text}</mark> : null;
}

export default function Inbox() {
  const { events, selectedId, setSelectedId, refresh, error: eventsError, loading } = useEvents();
  const [email, setEmail] = useState("");
  const [promptVersion, setPromptVersion] = useState("v2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);

  async function loadSample(index: number) {
    const sample = SAMPLES[index];
    if (!sample) return;
    setEmail(sample.email);
    setResult(null);
    try {
      let match = events.find((e) => e.name === sample.event.name && e.date === sample.event.date);
      if (!match) {
        match = await api.createEvent(sample.event);
        await refresh();
      }
      setSelectedId(match.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function run() {
    if (selectedId === null) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.extract({ email_text: email, event_id: selectedId, prompt_version: promptVersion }));
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const x = result?.extraction;
  return (
    <div>
      {eventsError && (
        <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {eventsError}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <EventPicker events={events} selectedId={selectedId} onSelect={setSelectedId} onCreated={refresh} />
        <select
          aria-label="Load sample email"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value=""
          onChange={(e) => void loadSample(Number(e.target.value))}
        >
          <option value="" disabled>Load sample email…</option>
          {SAMPLES.map((s, i) => (
            <option key={s.label} value={i}>{s.label}</option>
          ))}
        </select>
        <select
          aria-label="Prompt version"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={promptVersion}
          onChange={(e) => setPromptVersion(e.target.value)}
        >
          <option value="v1">Prompt v1</option>
          <option value="v2">Prompt v2</option>
        </select>
      </div>

      <textarea
        aria-label="Email text"
        className="mt-4 h-56 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
        placeholder="Paste a vendor email here, or load a sample above…"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={run}
          disabled={busy || !email.trim() || selectedId === null}
          className="rounded bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Extracting…" : "Extract"}
        </button>
        {selectedId === null && !loading && (
          <span className="text-sm text-slate-500">Create or pick an event first (or load a sample).</span>
        )}
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && x && (
        <>
          <Section title="Extracted fields">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldCard label="Vendor" field={x.vendor_name} />
              <FieldCard label="Contact email" field={x.contact_email} />
              <FieldCard label="Event name" field={x.event_name} />
              <FieldCard label="Event date" field={x.event_date} />
            </div>
          </Section>

          <Section title="Risks">
            {result.risks.length === 0 ? (
              <p className="text-sm text-slate-500">No risks flagged.</p>
            ) : (
              <div className="grid gap-2">{result.risks.map((r, i) => <RiskBadge key={i} risk={r} />)}</div>
            )}
          </Section>

          <Section title="Costs">
            {x.costs.length === 0 ? <p className="text-sm text-slate-500">No costs found.</p> : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {x.costs.map((c, i) => (
                  <li key={i} className="p-3 text-sm">
                    <div className="flex justify-between"><span>{c.label}</span><b>{money(c.amount_cad)}</b></div>
                    <Quote text={c.evidence} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Deadlines and action items">
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {x.deadlines.map((d, i) => (
                <li key={`d${i}`} className="p-3 text-sm">
                  <div className="flex justify-between"><span>Deadline: {d.label}</span><b>{d.due ?? "no date"}</b></div>
                  <Quote text={d.evidence} />
                </li>
              ))}
              {x.action_items.map((a, i) => (
                <li key={`a${i}`} className="p-3 text-sm">
                  <div className="flex justify-between">
                    <span>To do ({a.owner ?? "unassigned"}): {a.task}</span>
                    <b>{a.due ?? ""}</b>
                  </div>
                  <Quote text={a.evidence} />
                </li>
              ))}
              {x.deadlines.length + x.action_items.length === 0 && (
                <li className="p-3 text-sm text-slate-500">Nothing found.</li>
              )}
            </ul>
          </Section>

          {(x.requirements.length > 0 || x.open_questions.length > 0) && (
            <Section title="Requirements and open questions">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {x.requirements.map((r, i) => <li key={`r${i}`}>{r}</li>)}
                {x.open_questions.map((q, i) => <li key={`q${i}`} className="text-amber-800">{q}</li>)}
              </ul>
            </Section>
          )}

          <Section title="Draft reply (review before sending)">
            <DraftEditor extractionId={result.id} initial={result.draft_reply} />
          </Section>

          <p className="mt-4 text-xs text-slate-400">
            {result.meta.model} · prompt {result.meta.prompt_version} · {result.meta.latency_ms} ms · $
            {result.meta.cost_usd.toFixed(4)}
          </p>
        </>
      )}
    </div>
  );
}
