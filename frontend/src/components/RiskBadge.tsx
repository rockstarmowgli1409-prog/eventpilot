import type { RiskFlag } from "../api";
import { FlagIcon } from "../icons";
import { card } from "../ui";

const STYLES: Record<RiskFlag["severity"], { badge: string; icon: string }> = {
  high: {
    badge: "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200",
    icon: "text-red-500",
  },
  medium: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
    icon: "text-amber-500",
  },
  low: {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
    icon: "text-slate-400",
  },
};

export default function RiskBadge({ risk }: { risk: RiskFlag }) {
  const s = STYLES[risk.severity];
  const words = risk.rule.replaceAll("_", " ");
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return (
    <div className={`${card} flex items-start gap-3 p-3`}>
      <FlagIcon className={`mt-0.5 shrink-0 ${s.icon}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${s.badge}`}>
            {risk.severity}
          </span>
        </div>
        <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{risk.message}</div>
      </div>
    </div>
  );
}
