import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type EvalRun } from "../api";
import ResultView from "../components/ResultView";
import ThemeToggle from "../components/ThemeToggle";
import { DEMO_EMAIL, DEMO_RESULT } from "../demoData";
import { pct, seconds, usd } from "../format";
import { ArrowIcon, FlagIcon, HandIcon, LogoMark, QuoteIcon, ShieldIcon, SparkIcon } from "../icons";
import { btnPrimary, btnSecondary, card } from "../ui";

const STEPS = [
  { n: "1", title: "Paste a vendor email", body: "Prices in paragraphs, deadlines in the third line, insurance mentioned once. Paste it as it arrived." },
  { n: "2", title: "Get a grounded extraction", body: "Vendor, costs, dates, requirements and action items, each with the exact sentence it came from." },
  { n: "3", title: "See what could go wrong", body: "Plain-code rules flag past deadlines, blown budgets, date mismatches and missing insurance." },
  { n: "4", title: "Review a drafted reply", body: "A polite reply built only from extracted facts. You edit it, you copy it, you send it." },
];

const PRINCIPLES = [
  { Icon: QuoteIcon, title: "Every fact has a receipt", body: "If a quote is not literally in the email, the value is dropped. No quote, no claim." },
  { Icon: FlagIcon, title: "Risks are code, not vibes", body: "Each risk rule is plain Python with its own unit tests. Deterministic, explainable, free to run." },
  { Icon: HandIcon, title: "Nothing sends without you", body: "Drafts are for human review. EventPilot never emails a vendor on its own." },
];

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`${card} p-5`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

function Measured() {
  const [runs, setRuns] = useState<Record<string, EvalRun> | null>(null);
  useEffect(() => {
    api.latestEvals().then((r) => setRuns(r.runs), () => setRuns(null));
  }, []);
  const versions = Object.keys(runs ?? {}).sort();
  const first = runs?.[versions[0]];
  const latest = runs?.[versions[versions.length - 1]];
  if (!runs || !latest) return null;
  const baseline = versions.length > 1 ? first : undefined;
  const v2 = latest;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Measured, not claimed</h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
        Scored against {v2.n_cases} labelled synthetic emails (easy, messy and trap cases) on {v2.model}. The
        labels were drafted by Claude and are not yet independently reviewed, so treat these as a working baseline.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Overall score"
          value={pct(v2.overall_score)}
          sub={baseline ? `Prompt ${latest.prompt_version}, vs ${pct(baseline.overall_score)} with ${baseline.prompt_version}` : `Prompt ${latest.prompt_version}`}
        />
        <Tile
          label="Evidence grounding"
          value={pct(v2.grounding_rate)}
          sub={baseline ? `Quotes found verbatim, ${baseline.prompt_version} was ${pct(baseline.grounding_rate)}` : "Quotes found verbatim"}
        />
        <Tile label="Mean latency" value={seconds(v2.latency_mean_ms)} sub={`p95 ${seconds(v2.latency_p95_ms)}`} />
        <Tile label="Cost per 100 emails" value={usd(v2.cost_per_100_usd)} sub="Estimated from token prices" />
      </div>
      <Link to="/evals" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
        See the full comparison <ArrowIcon width={16} height={16} />
      </Link>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <LogoMark /> EventPilot
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Main">
          <Link to="/board" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 sm:block">Board</Link>
          <Link to="/evals" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 sm:block">Evals</Link>
          <ThemeToggle />
          <Link to="/inbox" className={`${btnPrimary} ml-2`}>Open app</Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-indigo-100/80 via-slate-50 to-transparent dark:from-indigo-950/60 dark:via-slate-950" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-8 sm:pt-20">
          <span className="fade-up inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-400/30 dark:bg-slate-900/60 dark:text-indigo-200">
            <SparkIcon width={14} height={14} /> AI operations copilot for event teams
          </span>
          <h1 className="fade-up mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Turn vendor emails into an event plan you can <span className="text-indigo-600 dark:text-indigo-400">trust</span>.
          </h1>
          <p className="fade-up mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Paste a messy thread. EventPilot pulls out costs, dates and action items, shows the exact sentence behind
            every fact, flags risks with plain code, and drafts a reply for you to approve.
          </p>
          <div className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/inbox" state={{ sample: 1 }} className={btnPrimary}>
              Try it with a sample email <ArrowIcon width={16} height={16} />
            </Link>
            <Link to="/evals" className={btnSecondary}>See the eval results</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-8" aria-labelledby="demo-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 id="demo-title" className="text-2xl font-bold tracking-tight">See it work</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real output from one run on a synthetic email. Hover the highlights.
          </p>
        </div>
        <ResultView email={DEMO_EMAIL} result={DEMO_RESULT} compact />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className={`${card} p-5`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{s.n}</div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <ShieldIcon className="text-indigo-600 dark:text-indigo-400" width={28} height={28} /> Built to be checked
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map(({ Icon, title, body }) => (
              <div key={title}>
                <Icon className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Measured />

      <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        EventPilot is a prototype. Demo uses synthetic emails. Do not paste confidential information.
      </footer>
    </div>
  );
}
