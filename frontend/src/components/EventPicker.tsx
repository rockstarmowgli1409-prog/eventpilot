import { useState } from "react";
import { api, type EventRecord } from "../api";

interface Props {
  events: EventRecord[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreated: () => Promise<void>;
}

export default function EventPicker({ events, selectedId, onSelect, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    try {
      const created = await api.createEvent({
        name,
        date,
        budget_cad: budget ? Number(budget) : null,
      });
      await onCreated();
      onSelect(created.id);
      setOpen(false);
      setName("");
      setDate("");
      setBudget("");
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const input = "rounded border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Event"
        className={input}
        value={selectedId ?? ""}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {events.length === 0 && <option value="">No events yet</option>}
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} ({ev.date})
          </option>
        ))}
      </select>
      <button className="text-sm text-indigo-700 underline" onClick={() => setOpen(!open)}>
        {open ? "Cancel" : "New event"}
      </button>
      {open && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input className={input} placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} type="date" aria-label="Event date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className={input} type="number" placeholder="Budget (CAD)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <button
            disabled={!name || !date}
            onClick={create}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Create
          </button>
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      )}
    </div>
  );
}
