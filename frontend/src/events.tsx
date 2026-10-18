import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type EventRecord } from "./api";

const KEY = "eventpilot.selectedEvent";

interface EventsState {
  events: EventRecord[];
  selectedId: number | null;
  selected: EventRecord | null;
  setSelectedId: (id: number | null) => void;
  refresh: () => Promise<void>;
  error: string | null;
  loading: boolean;
}

const EventsContext = createContext<EventsState | null>(null);

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
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

  const value = useMemo<EventsState>(
    () => ({
      events,
      selectedId,
      selected: events.find((e) => e.id === selectedId) ?? null,
      setSelectedId,
      refresh,
      error,
      loading,
    }),
    [events, selectedId, setSelectedId, refresh, error, loading],
  );
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsState {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used inside EventsProvider");
  return ctx;
}
