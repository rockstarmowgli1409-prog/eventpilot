import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, type ExtractResponse } from "../api";
import ResultView from "../components/ResultView";
import { useEvents } from "../events";
import { SAMPLES } from "../samples";
import { btnPrimary, card, input, muted } from "../ui";

function Skeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Extracting">
      <div className={`${card} h-72 animate-pulse`} />
      <div className="space-y-4">
        {[28, 20, 36, 24].map((h, i) => (
          <div key={i} className={`${card} animate-pulse`} style={{ height: `${h * 4}px` }} />
        ))}
      </div>
    </div>
  );
}

export default function Inbox() {
  const { events, selectedId, setSelectedId, refresh, loading, error: eventsError } = useEvents();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [promptVersion, setPromptVersion] = useState("v2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [analysed, setAnalysed] = useState("");
  const preloaded = useRef(false);

  async function loadSample(index: number) {
    const sample = SAMPLES[index];
    if (!sample) return;
    setEmail(sample.email);
    setResult(null);
    setError(null);
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

  // The landing page links here with ?sample preselected.
  useEffect(() => {
    const idx = (location.state as { sample?: number } | null)?.sample;
    if (idx === undefined || preloaded.current || loading) return;
    preloaded.current = true;
    void loadSample(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function run() {
    if (selectedId === null) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.extract({ email_text: email, event_id: selectedId, prompt_version: promptVersion }));
      setAnalysed(email);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
      <p className={`mt-1 text-sm ${muted}`}>Paste a vendor email and see what EventPilot finds, with receipts.</p>

      {eventsError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
          {eventsError}
        </div>
      )}

      <div className={`${card} mt-6 p-5`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Try a sample:</span>
          {SAMPLES.map((s, i) => (
            <button
              key={s.label}
              onClick={() => void loadSample(i)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200"
            >
              {s.label}
            </button>
          ))}
        </div>
        <textarea
          aria-label="Email text"
          className={`${input} h-48 w-full resize-y`}
          placeholder="Paste a vendor email here, or pick a sample above…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={busy || !email.trim() || selectedId === null} className={btnPrimary}>
            {busy ? "Extracting…" : "Extract"}
          </button>
          <div role="group" aria-label="Prompt version" className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs dark:border-slate-700">
            {["v1", "v2"].map((v) => (
              <button
                key={v}
                onClick={() => setPromptVersion(v)}
                aria-pressed={promptVersion === v}
                className={`px-3 py-2 font-medium ${
                  promptVersion === v ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Prompt {v}
              </button>
            ))}
          </div>
          {selectedId === null && !loading && (
            <span className={`text-sm ${muted}`}>Create an event in the sidebar, or load a sample.</span>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
          {error}
        </div>
      )}

      {busy && <Skeleton />}
      {result && !busy && (
        <div className="fade-up mt-8">
          <ResultView email={analysed} result={result} />
        </div>
      )}
    </div>
  );
}
