import { useEffect, useState } from "react";
import { api } from "../api";

export default function DraftEditor({ extractionId, initial }: { extractionId: number; initial: string }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => setText(initial), [initial, extractionId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard");
    } catch {
      setStatus("Copy failed. Select the text and copy it manually.");
    }
  }

  async function save() {
    try {
      await api.saveDraft(extractionId, text);
      setStatus("Draft saved");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <textarea
        aria-label="Draft reply"
        className="h-56 w-full resize-y rounded border border-slate-200 p-3 font-mono text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
          Save edits
        </button>
        <button onClick={copy} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
          Copy
        </button>
        {status && <span className="text-sm text-slate-500">{status}</span>}
        <span className="ml-auto text-xs text-slate-400">Nothing is sent automatically.</span>
      </div>
    </div>
  );
}
