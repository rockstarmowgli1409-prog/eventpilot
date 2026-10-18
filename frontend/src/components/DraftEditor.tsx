import { useEffect, useState } from "react";
import { api } from "../api";
import { btnPrimary, btnSecondary, card, muted } from "../ui";

interface Props {
  extractionId?: number;
  initial: string;
}

export default function DraftEditor({ extractionId, initial }: Props) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setText(initial);
    setStatus(null);
  }, [initial, extractionId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard");
    } catch {
      setStatus("Copy failed. Select the text and copy it manually.");
    }
  }

  async function save() {
    if (extractionId === undefined) return;
    try {
      await api.saveDraft(extractionId, text);
      setStatus("Draft saved");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <div className={`${card} p-4`}>
      <textarea
        aria-label="Draft reply"
        className="h-56 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {extractionId !== undefined && (
          <button onClick={save} className={btnPrimary}>
            Save edits
          </button>
        )}
        <button onClick={copy} className={btnSecondary}>
          Copy
        </button>
        {status && <span className={`text-sm ${muted}`}>{status}</span>}
        <span className="ml-auto text-xs text-slate-400">Nothing is sent automatically.</span>
      </div>
    </div>
  );
}
