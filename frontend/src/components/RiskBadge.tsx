import type { RiskFlag } from "../api";

const STYLES: Record<RiskFlag["severity"], string> = {
  high: "bg-red-100 text-red-800 ring-red-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  low: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default function RiskBadge({ risk }: { risk: RiskFlag }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <span
        className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${STYLES[risk.severity]}`}
      >
        {risk.severity}
      </span>
      <div>
        <div className="text-sm font-medium">{risk.rule.replaceAll("_", " ")}</div>
        <div className="text-sm text-slate-600">{risk.message}</div>
      </div>
    </div>
  );
}
