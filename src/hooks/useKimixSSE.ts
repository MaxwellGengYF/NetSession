import { useState, useEffect, useCallback } from "react";
import { getEventStreamUrl } from "@/api/kimixClient";

export type ConnectionState = "connecting" | "open" | "closed" | "error";

export interface KimixEvent {
  type: string;
  properties: Record<string, unknown>;
}

type EventCallback = (event: KimixEvent) => void;

// ── Singleton state ─────────────────────────────────────────────

let globalEventSource: EventSource | null = null;
let globalConnectionState: ConnectionState = "closed";
const stateListeners = new Set<(state: ConnectionState) => void>();
const eventSubscribers = new Map<string, Set<EventCallback>>();
const globalSubscribers = new Set<EventCallback>();
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
const maxReconnectAttempts = 3;

function notifyState(state: ConnectionState) {
  globalConnectionState = state;
  stateListeners.forEach((cb) => cb(state));
}

function emitEvent(event: KimixEvent) {
  // Global subscribers
  globalSubscribers.forEach((cb) => {
    try {
      cb(event);
    } catch {
      /* ignore */
    }
  });

  // Session-scoped subscribers
  const sessionID = (event.properties.sessionID as string) || "";
  if (sessionID) {
    const subs = eventSubscribers.get(sessionID);
    subs?.forEach((cb) => {
      try {
        cb(event);
      } catch {
        /* ignore */
      }
    });
  }
}

function connectEventSource() {
  if (globalEventSource) return;

  notifyState("connecting");
  const url = getEventStreamUrl();
  const es = new EventSource(url);

  es.onopen = () => {
    notifyState("open");
    reconnectAttempts = 0;
  };

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as KimixEvent;
      emitEvent(data);
    } catch (err) {
      console.error("[useKimixSSE] Failed to parse SSE message:", e.data, err);
    }
  };

  es.onerror = () => {
    notifyState("error");
    globalEventSource = null;

    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
      reconnectTimeout = setTimeout(() => {
        connectEventSource();
      }, delay);
    } else {
      notifyState("closed");
    }
  };

  globalEventSource = es;
}

export function disconnectEventSource() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
    notifyState("closed");
  }
}

// ── Hook ────────────────────────────────────────────────────────

export function useKimixSSE() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    globalConnectionState
  );

  useEffect(() => {
    stateListeners.add(setConnectionState);
    if (!globalEventSource || globalEventSource.readyState === EventSource.CLOSED) {
      connectEventSource();
    }
    return () => {
      stateListeners.delete(setConnectionState);
    };
  }, []);

  const subscribe = useCallback(
    (sessionID: string, callback: EventCallback) => {
      if (!eventSubscribers.has(sessionID)) {
        eventSubscribers.set(sessionID, new Set());
      }
      const subs = eventSubscribers.get(sessionID)!;
      subs.add(callback);
      return () => {
        subs.delete(callback);
        if (subs.size === 0) {
          eventSubscribers.delete(sessionID);
        }
      };
    },
    []
  );

  const subscribeGlobal = useCallback((callback: EventCallback) => {
    globalSubscribers.add(callback);
    return () => {
      globalSubscribers.delete(callback);
    };
  }, []);

  const reconnect = useCallback(() => {
    disconnectEventSource();
    reconnectAttempts = 0;
    connectEventSource();
  }, []);

  return {
    connectionState,
    subscribe,
    subscribeGlobal,
    reconnect,
  };
}
