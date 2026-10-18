import { useMemo, useState } from "react";
import type { ExtractResponse } from "../api";
import { collectQuotes } from "../highlight";
import { money } from "../format";
import { card, muted, sectionTitle } from "../ui";
import DraftEditor from "./DraftEditor";
import Fact from "./Fact";
import FieldCard from "./FieldCard";
import HighlightedEmail from "./HighlightedEmail";
import RiskBadge from "./RiskBadge";

interface Props {
  email: string;
  result: Omit<ExtractResponse, "id"> & { id?: number };
  compact?: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={`${sectionTitle} mb-2`}>{title}</h2>
      {children}
    </section>
  );
}

export default function ResultView({ email, result, compact = false }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const x = result.extraction;
  const quotes = useMemo(() => collectQuotes(x), [x]);
  const list = `${card} divide-y divide-slate-100 overflow-hidden dark:divide-slate-800`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="lg:sticky lg:top-6">
        <HighlightedEmail email={email} quotes={quotes} activeId={active} onActive={setActive} />
      </div>

      <div className="space-y-6">
        <Section title="Risks">
          {result.risks.length === 0 ? (
            <p className={`${card} p-4 text-sm ${muted}`}>No risks flagged by the rule engine.</p>
          ) : (
            <div className="grid gap-2">
              {result.risks.map((r, i) => (
                <RiskBadge key={i} risk={r} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Extracted fields">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldCard label="Vendor" id="vendor_name" field={x.vendor_name} active={active === "vendor_name"} onActive={setActive} />
            <FieldCard label="Contact email" id="contact_email" field={x.contact_email} active={active === "contact_email"} onActive={setActive} />
            <FieldCard label="Event name" id="event_name" field={x.event_name} active={active === "event_name"} onActive={setActive} />
            <FieldCard label="Event date" id="event_date" field={x.event_date} active={active === "event_date"} onActive={setActive} />
          </div>
        </Section>

        <Section title="Costs">
          {x.costs.length === 0 ? (
            <p className={`${card} p-4 text-sm ${muted}`}>No costs found.</p>
          ) : (
            <ul className={list}>
              {x.costs.map((c, i) => (
                <Fact
                  key={i}
                  id={`cost:${i}`}
                  tone="cost"
                  title={c.label}
                  right={money(c.amount_cad)}
                  evidence={c.evidence}
                  active={active === `cost:${i}`}
                  onActive={setActive}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Deadlines and action items">
          <ul className={list}>
            {x.deadlines.map((d, i) => (
              <Fact
                key={`d${i}`}
                id={`deadline:${i}`}
                tone="deadline"
                title={d.label}
                right={d.due ?? "no date"}
                evidence={d.evidence}
                active={active === `deadline:${i}`}
                onActive={setActive}
              />
            ))}
            {x.action_items.map((a, i) => (
              <Fact
                key={`a${i}`}
                id={`action:${i}`}
                tone="action"
                title={`${a.task} (${a.owner ?? "unassigned"})`}
                right={a.due ?? ""}
                evidence={a.evidence}
                active={active === `action:${i}`}
                onActive={setActive}
              />
            ))}
            {x.deadlines.length + x.action_items.length === 0 && (
              <li className={`px-4 py-3 text-sm ${muted}`}>Nothing found.</li>
            )}
          </ul>
        </Section>

        {(x.requirements.length > 0 || x.open_questions.length > 0) && (
          <Section title="Requirements and open questions">
            <ul className={`${card} space-y-1.5 p-4 text-sm`}>
              {x.requirements.map((r, i) => (
                <li key={`r${i}`}>• {r}</li>
              ))}
              {x.open_questions.map((q, i) => (
                <li key={`q${i}`} className="text-amber-700 dark:text-amber-300">
                  ? {q}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!compact && (
          <Section title="Draft reply (review before sending)">
            <DraftEditor extractionId={result.id} initial={result.draft_reply} />
          </Section>
        )}

        <p className="text-xs text-slate-400">
          {result.meta.model} · prompt {result.meta.prompt_version} · {(result.meta.latency_ms / 1000).toFixed(1)} s · $
          {result.meta.cost_usd.toFixed(4)}
        </p>
      </div>
    </div>
  );
}
