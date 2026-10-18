import { buildSegments, TONE_CLASS, TONE_DOT, type Quote, type Tone } from "../highlight";
import { card, sectionTitle } from "../ui";

interface Props {
  email: string;
  quotes: Quote[];
  activeId: string | null;
  onActive: (id: string | null) => void;
}

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: "field", label: "Fields" },
  { tone: "cost", label: "Costs" },
  { tone: "deadline", label: "Deadlines" },
  { tone: "action", label: "Actions" },
];

export default function HighlightedEmail({ email, quotes, activeId, onActive }: Props) {
  const segments = buildSegments(email, quotes);
  return (
    <div className={`${card} p-5`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={sectionTitle}>Source email</h2>
        <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
          {LEGEND.map((l) => (
            <span key={l.tone} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${TONE_DOT[l.tone]}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
        {segments.map((seg, i) => {
          if (seg.quotes.length === 0) return <span key={i}>{seg.text}</span>;
          const first = seg.quotes[0];
          const isActive = seg.quotes.some((q) => q.id === activeId);
          return (
            <mark
              key={i}
              title={seg.quotes.map((q) => q.label).join(" + ")}
              onMouseEnter={() => onActive(first.id)}
              onMouseLeave={() => onActive(null)}
              className={`cursor-pointer rounded px-0.5 transition ${TONE_CLASS[first.tone]} ${
                isActive ? "ring-2 ring-indigo-500" : ""
              }`}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>
      <p className="mt-3 text-xs text-slate-400">
        Hover a highlight or a card to connect a fact to the sentence it came from.
      </p>
    </div>
  );
}
