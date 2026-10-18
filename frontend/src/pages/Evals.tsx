import { useEffect, useState } from "react";
import { api, type EvalRun } from "../api";
import { pct, seconds, usd } from "../format";
import { card, muted, sectionTitle } from "../ui";

type Getter = (r: EvalRun) => number | null | undefined;

const ROWS: { label: string; get: Getter; fmt: (n: number | null | undefined) => string; lowerIsBetter?: boolean }[] = [
  { label: "Overall score", get: (r) => r.overall_score, fmt: pct },
  { label: "Vendor name accuracy", get: (r) => r.scalars.vendor_name?.accuracy, fmt: pct },
  { label: "Event date accuracy", get: (r) => r.scalars.event_date?.accuracy, fmt: pct },
  { label: "Cost F1", get: (r) => r.lists.costs?.f1, fmt: pct },
  { label: "Deadline F1", get: (r) => r.lists.deadlines?.f1, fmt: pct },
  { label: "Action item F1", get: (r) => r.lists.action_items?.f1, fmt: pct },
  { label: "Requirements F1", get: (r) => r.lists.requirements?.f1, fmt: pct },
  { label: "Risk flag accuracy", get: (r) => r.risk_accuracy, fmt: pct },
  { label: "Evidence grounding rate", get: (r) => r.grounding_rate, fmt: pct },
  { label: "Mean latency", get: (r) => r.latency_mean_ms, fmt: seconds, lowerIsBetter: true },
  { label: "p95 latency", get: (r) => r.latency_p95_ms, fmt: seconds, lowerIsBetter: true },
  { label: "Cost per 100 emails", get: (r) => r.cost_per_100_usd, fmt: usd, lowerIsBetter: true },
];

const BARS: { label: string; get: Getter }[] = [
  { label: "Vendor", get: (r) => r.scalars.vendor_name?.accuracy },
  { label: "Date", get: (r) => r.scalars.event_date?.accuracy },
  { label: "Costs F1", get: (r) => r.lists.costs?.f1 },
  { label: "Deadlines F1", get: (r) => r.lists.deadlines?.f1 },
  { label: "Action items F1", get: (r) => r.lists.action_items?.f1 },
  { label: "Grounding", get: (r) => r.grounding_rate },
];

const BAR_COLOR: Record<string, string> = { v1: "bg-slate-400 dark:bg-slate-500", v2: "bg-indigo-600" };

function Delta({ a, b, lowerIsBetter }: { a: number | null | undefined; b: number | null | undefined; lowerIsBetter?: boolean }) {
  if (a == null || b == null || a === b) return null;
  const better = lowerIsBetter ? b < a : b > a;
  return (
    <span className={`ml-2 text-xs ${better ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {better ? "▲" : "▼"}
    </span>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={`${card} p-5`}>
      <div className={sectionTitle}>{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
      <div className={`mt-1 text-sm ${muted}`}>{sub}</div>
    </div>
  );
}

export default function Evals() {
  const [runs, setRuns] = useState<Record<string, EvalRun> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.latestEvals().then((r) => setRuns(r.runs), (e: Error) => setError(e.message));
  }, []);

  const header = (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Evals</h1>
      <p className={`mt-1 text-sm ${muted}`}>
        How well extraction works, measured against labelled emails. Latest run per prompt version.
      </p>
    </>
  );

  if (error) {
    return (
      <div>
        {header}
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">{error}</div>
      </div>
    );
  }
  if (!runs) {
    return (
      <div>
        {header}
        <div className={`${card} mt-6 h-64 animate-pulse`} aria-busy="true" />
      </div>
    );
  }

  const versions = Object.keys(runs).sort();
  if (versions.length === 0) {
    return (
      <div>
        {header}
        <div className={`${card} mt-8 border-dashed p-10 text-center text-sm`}>
          <p className="font-medium">No eval runs yet</p>
          <p className={`mt-1 ${muted}`}>
            Run <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">python -m evals.run_eval --prompt v1</code> and{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">--prompt v2</code> in the backend folder, then refresh.
          </p>
        </div>
      </div>
    );
  }

  const first = runs[versions[0]];
  const latest = runs[versions[versions.length - 1]];
  const baseline = versions.length > 1 ? first : undefined;
  const difficulties = ["easy", "messy", "traps"];

  return (
    <div>
      {header}
      <p className={`mt-3 text-sm ${muted}`}>
        {first.n_cases} synthetic emails on {first.model}. Labels were drafted by Claude and are not independently reviewed.
      </p>

      <div className="fade-up mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Overall score" value={pct(latest.overall_score)} sub={baseline ? `${latest.prompt_version}, vs ${pct(baseline.overall_score)} for ${baseline.prompt_version}` : latest.prompt_version} />
        <Tile label="Evidence grounding" value={pct(latest.grounding_rate)} sub="Quotes found verbatim in the email" />
        <Tile label="Mean latency" value={seconds(latest.latency_mean_ms)} sub={`p95 ${seconds(latest.latency_p95_ms)}`} />
        <Tile label="Cost per 100 emails" value={usd(latest.cost_per_100_usd)} sub="Estimated from token prices" />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <section>
          <h2 className={`${sectionTitle} mb-2`}>Metrics by prompt version</h2>
          <table className={`${card} w-full overflow-hidden text-sm`}>
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="p-3 font-medium">Metric</th>
                {versions.map((v) => (
                  <th key={v} className="p-3 font-medium">Prompt {v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="p-3">{row.label}</td>
                  {versions.map((v, i) => (
                    <td key={v} className="p-3 font-mono tabular-nums">
                      {row.fmt(row.get(runs[v]))}
                      {i === versions.length - 1 && versions.length > 1 && (
                        <Delta a={row.get(runs[versions[0]])} b={row.get(runs[v])} lowerIsBetter={row.lowerIsBetter} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-6">
          <section>
            <h2 className={`${sectionTitle} mb-2`}>Prompt comparison</h2>
            <div className={`${card} space-y-4 p-4`}>
              {BARS.map((m) => (
                <div key={m.label}>
                  <div className={`mb-1 text-xs ${muted}`}>{m.label}</div>
                  {versions.map((v) => {
                    const value = m.get(runs[v]) ?? 0;
                    return (
                      <div key={v} className="mb-1 flex items-center gap-2">
                        <span className="w-6 text-xs">{v}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className={`h-full rounded-full ${BAR_COLOR[v] ?? "bg-slate-500"}`} style={{ width: `${value * 100}%` }} />
                        </div>
                        <span className="w-14 text-right font-mono text-xs tabular-nums">{pct(m.get(runs[v]))}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {latest.by_difficulty && (
            <section>
              <h2 className={`${sectionTitle} mb-2`}>Overall score by difficulty</h2>
              <table className={`${card} w-full overflow-hidden text-sm`}>
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                    <th className="p-3 font-medium">Set</th>
                    {versions.map((v) => (
                      <th key={v} className="p-3 font-medium">{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {difficulties.map((d) => (
                    <tr key={d} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="p-3 capitalize">{d}</td>
                      {versions.map((v) => (
                        <td key={v} className="p-3 font-mono tabular-nums">{pct(runs[v].by_difficulty?.[d])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
