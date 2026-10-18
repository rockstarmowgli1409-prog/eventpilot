import type { Grounded } from "../api";
import { TONE_CLASS } from "../highlight";
import { card } from "../ui";

function confidenceColor(c: number): string {
  if (c >= 0.8) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200";
  if (c >= 0.6) return "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200";
}

interface Props {
  label: string;
  field: Grounded<string>;
  id?: string;
  active?: boolean;
  onActive?: (id: string | null) => void;
}

export default function FieldCard({ label, field, id, active, onActive }: Props) {
  const missing = field.value === null;
  return (
    <div
      onMouseEnter={() => id && onActive?.(id)}
      onMouseLeave={() => onActive?.(null)}
      className={`${card} p-4 transition ${active ? "ring-2 ring-indigo-500" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {!missing && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceColor(field.confidence)}`}>
            {Math.round(field.confidence * 100)}% confident
          </span>
        )}
      </div>
      <div className={`mt-1 break-words text-lg font-semibold ${missing ? "text-slate-400 dark:text-slate-500" : ""}`}>
        {missing ? "Not found in email" : field.value}
      </div>
      {field.evidence && (
        <blockquote className="mt-2 text-sm">
          <mark className={`rounded px-1 ${TONE_CLASS.field}`}>{field.evidence}</mark>
        </blockquote>
      )}
    </div>
  );
}
