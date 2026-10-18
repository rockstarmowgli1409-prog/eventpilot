import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Board as BoardData } from "../api";
import RiskBadge from "../components/RiskBadge";
import { useEvents } from "../events";
import { money } from "../format";
import { btnPrimary, card, muted, sectionTitle } from "../ui";

const KIND_DOT = { event: "bg-indigo-500", deadline: "bg-amber-500", action: "bg-sky-500" } as const;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className={sectionTitle}>{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

export default function Board() {
  const { selectedId, error: eventsError, loading } = useEvents();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null) {
      setBoard(null);
      return;
    }
    api.board(selectedId).then(
      (b) => {
        setBoard(b);
        setError(null);
      },
      (e: Error) => setError(e.message),
    );
  }, [selectedId]);

  const err = error ?? eventsError;
  const over = !!board?.budget_cad && board.cost_total_cad > board.budget_cad;
  const ratio = board?.budget_cad ? Math.min(board.cost_total_cad / board.budget_cad, 1) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{board ? board.event.name : "Board"}</h1>
      <p className={`mt-1 text-sm ${muted}`}>
        {board ? `Event on ${board.event.date}. Updates after every extraction.` : "Everything extracted for the selected event."}
      </p>

      {err && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
          {err}
        </div>
      )}

      {!board && !err && !loading && (
        <div className={`${card} mt-8 border-dashed p-10 text-center`}>
          <p className="font-medium">No event selected yet</p>
          <p className={`mt-1 text-sm ${muted}`}>Create an event and extract an email to fill the board.</p>
          <Link to="/inbox" state={{ sample: 0 }} className={`${btnPrimary} mt-4`}>Start with a sample</Link>
        </div>
      )}

      {board && (
        <div className="fade-up mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Quoted so far" value={money(board.cost_total_cad)} tone={over ? "text-red-600 dark:text-red-400" : ""} />
            <Stat
              label={over ? "Over budget by" : "Budget left"}
              value={board.budget_cad ? money(Math.abs(board.budget_cad - board.cost_total_cad)) : "—"}
              tone={over ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
            />
            <Stat label="Open action items" value={String(board.open_action_items.length)} />
            <Stat label="Risks flagged" value={String(board.risks.length)} />
          </div>

          <div className={`${card} p-4`}>
            <div className="flex justify-between text-sm">
              <span>{money(board.cost_total_cad)} quoted</span>
              <span className={muted}>{board.budget_cad ? `of ${money(board.budget_cad)} budget` : "no budget set"}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                data-testid="budget-bar"
                className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className={`${sectionTitle} mb-2`}>Timeline</h2>
              <ol className={`${card} p-4`}>
                {board.timeline.map((t, i) => (
                  <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < board.timeline.length - 1 && (
                      <span aria-hidden className="absolute left-[5px] top-3 h-full w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    <span className={`relative mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-white dark:ring-slate-900 ${KIND_DOT[t.kind]}`} />
                    <div className="text-sm">
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{t.date}</div>
                      <div className="font-medium">{t.label}</div>
                      {t.vendor && <div className={`text-xs ${muted}`}>{t.vendor} · {t.kind}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="space-y-6">
              <section>
                <h2 className={`${sectionTitle} mb-2`}>Costs</h2>
                {board.costs.length === 0 ? (
                  <p className={`${card} p-4 text-sm ${muted}`}>No costs yet.</p>
                ) : (
                  <table className={`${card} w-full overflow-hidden text-sm`}>
                    <tbody>
                      {board.costs.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                          <td className="p-3">{c.vendor ?? "Unknown vendor"}</td>
                          <td className={`p-3 ${muted}`}>{c.label}</td>
                          <td className="p-3 text-right font-semibold tabular-nums">{money(c.amount_cad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section>
                <h2 className={`${sectionTitle} mb-2`}>Open action items</h2>
                {board.open_action_items.length === 0 ? (
                  <p className={`${card} p-4 text-sm ${muted}`}>Nothing open.</p>
                ) : (
                  <ul className={`${card} divide-y divide-slate-100 text-sm dark:divide-slate-800`}>
                    {board.open_action_items.map((a, i) => (
                      <li key={i} className="flex justify-between gap-3 p-3">
                        <span>☐ {a.task}</span>
                        <span className={`shrink-0 ${muted}`}>{a.owner ?? "unassigned"}{a.due ? ` · ${a.due}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className={`${sectionTitle} mb-2`}>Risk summary</h2>
                {board.risks.length === 0 ? (
                  <p className={`${card} p-4 text-sm ${muted}`}>No risks flagged.</p>
                ) : (
                  <div className="grid gap-2">{board.risks.map((r, i) => <RiskBadge key={i} risk={r} />)}</div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
