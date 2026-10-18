import { useState } from "react";
import { api } from "../api";
import { useEvents } from "../events";
import { btnPrimary, input } from "../ui";

export default function EventPicker() {
  const { events, selectedId, setSelectedId, refresh, error: loadError } = useEvents();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    try {
      const created = await api.createEvent({ name, date, budget_cad: budget ? Number(budget) : null });
      await refresh();
      setSelectedId(created.id);
      setOpen(false);
      setName("");
      setDate("");
      setBudget("");
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="event-select">
        Event
      </label>
      <select
        id="event-select"
        aria-label="Event"
        className={`${input} w-full`}
        value={selectedId ?? ""}
        onChange={(e) => setSelectedId(Number(e.target.value))}
      >
        {events.length === 0 && <option value="">No events yet</option>}
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} ({ev.date})
          </option>
        ))}
      </select>
      <button className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setOpen(!open)}>
        {open ? "Cancel" : "+ New event"}
      </button>
      {open && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <input className={`${input} w-full`} placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={`${input} w-full`} type="date" aria-label="Event date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className={`${input} w-full`} type="number" placeholder="Budget (CAD)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <button disabled={!name || !date} onClick={create} className={`${btnPrimary} w-full`}>
            Create event
          </button>
        </div>
      )}
      {(error ?? loadError) && <p className="text-xs text-red-600 dark:text-red-400">{error ?? loadError}</p>}
    </div>
  );
}
