import { useAction } from "convex/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../../convex/_generated/api";
import { type PublicEvent, todayInTampa } from "../../convex/lib/tampa";

type EventsState = {
  status: "loading" | "ready" | "error";
  events: PublicEvent[];
  today: string;
  fetchedAt: number | null;
  stale: boolean;
  reload: () => void;
};

const EventsContext = createContext<EventsState | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const listUpcoming = useAction(api.events.listUpcoming);
  const [state, setState] = useState<Omit<EventsState, "reload">>({
    status: "loading",
    events: [],
    today: todayInTampa(),
    fetchedAt: null,
    stale: false,
  });

  const load = useCallback(() => {
    setState(s => ({ ...s, status: s.fetchedAt ? s.status : "loading" }));
    listUpcoming({})
      .then(r =>
        setState({
          status: "ready",
          events: r.events,
          today: r.today,
          fetchedAt: r.fetchedAt,
          stale: r.stale,
        }),
      )
      .catch(() => setState(s => ({ ...s, status: "error" })));
  }, [listUpcoming]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <EventsContext.Provider value={{ ...state, reload: load }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents(): EventsState {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used inside EventsProvider");
  return ctx;
}
