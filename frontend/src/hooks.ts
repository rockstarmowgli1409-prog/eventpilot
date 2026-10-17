import { useCallback, useEffect, useState } from "react";
import { api, type EventRecord } from "./api";

const KEY = "eventpilot.selectedEvent";

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function useEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedId, setSelectedIdState] = useState<number | null>(readStored);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSelectedId = useCallback((id: number | null) => {
    setSelectedIdState(id);
    try {
      if (id === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, String(id));
    } catch {
      /* storage unavailable: selection just won't persist */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await api.listEvents();
      setEvents(list);
      setError(null);
      setSelectedIdState((cur) => (list.some((e) => e.id === cur) ? cur : (list[0]?.id ?? null)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, selectedId, setSelectedId, refresh, error, loading };
}
