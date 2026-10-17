import { useEffect, useState } from "react";
import { api, type EvalRun } from "../api";
import { pct, seconds, usd } from "../format";

const ROWS: { label: string; get: (r: EvalRun) => string }[] = [
  { label: "Overall score", get: (r) => pct(r.overall_score) },
  { label: "Vendor name accuracy", get: (r) => pct(r.scalars.vendor_name?.accuracy) },
  { label: "Event date accuracy", get: (r) => pct(r.scalars.event_date?.accuracy) },
  { label: "Cost F1", get: (r) => pct(r.lists.costs?.f1) },
  { label: "Deadline F1", get: (r) => pct(r.lists.deadlines?.f1) },
  { label: "Action item F1", get: (r) => pct(r.lists.action_items?.f1) },
  { label: "Risk flag accuracy", get: (r) => pct(r.risk_accuracy) },
  { label: "Evidence grounding rate", get: (r) => pct(r.grounding_rate) },
  { label: "Mean latency", get: (r) => seconds(r.latency_mean_ms) },
  { label: "p95 latency", get: (r) => seconds(r.latency_p95_ms) },
  { label: "Cost per 100 emails", get: (r) => usd(r.cost_per_100_usd) },
];

const BAR_METRICS: { label: string; get: (r: EvalRun) => number | null | undefined }[] = [
  { label: "Vendor", get: (r) => r.scalars.vendor_name?.accuracy },
  { label: "Date", get: (r) => r.scalars.event_date?.accuracy },
  { label: "Costs F1", get: (r) => r.lists.costs?.f1 },
  { label: "Deadlines F1", get: (r) => r.lists.deadlines?.f1 },
  { label: "Grounding", get: (r) => r.grounding_rate },
];

const COLORS: Record<string, string> = { v1: "bg-slate-400", v2: "bg-indigo-600" };

export default function Evals() {
  const [runs, setRuns] = useState<Record<string, EvalRun> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.latestEvals().then((r) => setRuns(r.runs), (e: Error) => setError(e.message));
  }, []);

  if (error) {
    return <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  }
  if (!runs) return <p className="text-sm text-slate-500">Loading…</p>;

  const versions = Object.keys(runs).sort();
  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        <p className="font-medium">No eval runs yet.</p>
        <p className="mt-1">
          Run <code className="rounded bg-slate-100 px-1">python -m evals.run_eval --prompt v1</code> (and{" "}
          <code className="rounded bg-slate-100 px-1">--prompt v2</code>) in the backend folder, then refresh.
        </p>
      </div>
    );
  }

  const first = runs[versions[0]];
  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Scored against {first.n_cases} labelled synthetic emails on {first.model}. Latest run per prompt version.
      </p>
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="p-2">Metric</th>
            {versions.map((v) => (
              <th key={v} className="p-2">Prompt {v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b border-slate-100 last:border-0">
              <td className="p-2">{row.label}</td>
              {versions.map((v) => (
                <td key={v} className="p-2 font-mono">{row.get(runs[v])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Prompt comparison
      </h2>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        {BAR_METRICS.map((m) => (
          <div key={m.label}>
            <div className="mb-1 text-xs text-slate-500">{m.label}</div>
            {versions.map((v) => {
              const value = m.get(runs[v]) ?? 0;
              return (
                <div key={v} className="mb-1 flex items-center gap-2">
                  <span className="w-6 text-xs">{v}</span>
                  <div className="h-3 flex-1 rounded bg-slate-100">
                    <div className={`h-full rounded ${COLORS[v] ?? "bg-slate-500"}`} style={{ width: `${value * 100}%` }} />
                  </div>
                  <span className="w-14 text-right font-mono text-xs">{pct(m.get(runs[v]))}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
