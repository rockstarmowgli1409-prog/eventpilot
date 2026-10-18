import { TONE_CLASS, TONE_DOT, type Tone } from "../highlight";

interface Props {
  id: string;
  tone: Tone;
  title: string;
  right?: React.ReactNode;
  evidence: string | null;
  active: boolean;
  onActive: (id: string | null) => void;
}

/** One row in a list of extracted facts (cost, deadline, action) with its source quote. */
export default function Fact({ id, tone, title, right, evidence, active, onActive }: Props) {
  return (
    <li
      onMouseEnter={() => onActive(id)}
      onMouseLeave={() => onActive(null)}
      className={`px-4 py-3 text-sm transition ${active ? "bg-indigo-50 dark:bg-indigo-400/10" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
          <span>{title}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{right}</span>
      </div>
      {evidence && (
        <mark className={`mt-1.5 ml-4 inline-block rounded px-1 text-xs ${TONE_CLASS[tone]}`}>{evidence}</mark>
      )}
    </li>
  );
}
