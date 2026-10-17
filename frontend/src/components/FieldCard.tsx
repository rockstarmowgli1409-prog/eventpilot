import type { Grounded } from "../api";

function confidenceColor(c: number): string {
  if (c >= 0.8) return "bg-emerald-100 text-emerald-800";
  if (c >= 0.6) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function FieldCard({ label, field }: { label: string; field: Grounded<string> }) {
  const missing = field.value === null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {!missing && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceColor(field.confidence)}`}
          >
            {Math.round(field.confidence * 100)}% confident
          </span>
        )}
      </div>
      <div className={`mt-1 text-lg font-semibold ${missing ? "text-slate-400" : ""}`}>
        {missing ? "Not found in email" : field.value}
      </div>
      {field.evidence && (
        <blockquote className="mt-2 text-sm text-slate-600">
          <mark className="rounded bg-yellow-100 px-1">{field.evidence}</mark>
        </blockquote>
      )}
    </div>
  );
}
