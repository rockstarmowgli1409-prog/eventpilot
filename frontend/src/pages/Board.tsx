import { useEffect, useState } from "react";
import { api, type Board as BoardData } from "../api";
import EventPicker from "../components/EventPicker";
import RiskBadge from "../components/RiskBadge";
import { money } from "../format";
import { useEvents } from "../hooks";

const KIND_STYLE = {
  event: "bg-indigo-100 text-indigo-800",
  deadline: "bg-amber-100 text-amber-800",
  action: "bg-slate-100 text-slate-700",
} as const;

export default function Board() {
  const { events, selectedId, setSelectedId, refresh, error: eventsError } = useEvents();
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

  const ratio = board?.budget_cad ? Math.min(board.cost_total_cad / board.budget_cad, 1) : 0;
  const over = !!board?.budget_cad && board.cost_total_cad > board.budget_cad;

  return (
    <div>
      <EventPicker events={events} selectedId={selectedId} onSelect={setSelectedId} onCreated={refresh} />
      {(error ?? eventsError) && (
        <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error ?? eventsError}
        </div>
      )}
      {!board && !error && !eventsError && (
        <p className="mt-8 text-sm text-slate-500">
          No event selected yet. Create one on the Inbox page and extract an email to fill the board.
        </p>
      )}
      {board && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="md:col-span-2">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Budget</h2>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex justify-between text-sm">
                <span>{money(board.cost_total_cad)} quoted</span>
                <span>{board.budget_cad ? `of ${money(board.budget_cad)}` : "no budget set"}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded bg-slate-100">
                <div
                  data-testid="budget-bar"
                  className={`h-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {board.timeline.map((t, i) => (
                <li key={i} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-24 shrink-0 font-mono text-xs">{t.date}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_STYLE[t.kind]}`}>{t.kind}</span>
                  <span>{t.label}{t.vendor ? ` (${t.vendor})` : ""}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Costs</h2>
            {board.costs.length === 0 ? (
              <p className="text-sm text-slate-500">No costs yet.</p>
            ) : (
              <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
                <tbody>
                  {board.costs.map((c, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="p-2">{c.vendor ?? "Unknown vendor"}</td>
                      <td className="p-2">{c.label}</td>
                      <td className="p-2 text-right">{money(c.amount_cad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Open action items</h2>
            {board.open_action_items.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing open.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {board.open_action_items.map((a, i) => (
                  <li key={i}>☐ {a.task} <span className="text-slate-500">({a.owner ?? "unassigned"}{a.due ? `, ${a.due}` : ""})</span></li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Risk summary</h2>
            {board.risks.length === 0 ? (
              <p className="text-sm text-slate-500">No risks flagged.</p>
            ) : (
              <div className="grid gap-2">{board.risks.map((r, i) => <RiskBadge key={i} risk={r} />)}</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
