import { useState, useEffect, useCallback } from 'react';

export type ReadyState = 'connecting' | 'open' | 'closed' | 'error';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: unknown[];
  id?: number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string };
  id?: number;
}

// --- Singleton WebSocket state (shared across all consumers) ---
let globalWs: WebSocket | null = null;
let globalReadyState: ReadyState = 'closed';
const stateListeners = new Set<(state: ReadyState) => void>();
const pendingQueue: { resolve: (value: unknown) => void; reject: (reason: Error) => void }[] = [];
let requestId = 1;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function notifyState(state: ReadyState) {
  globalReadyState = state;
  stateListeners.forEach((cb) => cb(state));
}

function connectSocket(url: string) {
  if (globalWs) return;
  notifyState('connecting');
  const ws = new WebSocket(url);

  ws.onopen = () => {
    notifyState('open');
    reconnectAttempts = 0;
  };

  ws.onmessage = (event) => {
    try {
      const data: JsonRpcResponse = JSON.parse(event.data);
      const pending = data.id !== undefined
        ? pendingQueue.find((p) => p)
        : pendingQueue.shift();
      if (pending) {
        if (data.id !== undefined) {
          const idx = pendingQueue.indexOf(pending);
          if (idx !== -1) pendingQueue.splice(idx, 1);
        }
        if (data.error) {
          pending.reject(new Error(`JSON-RPC Error ${data.error.code}: ${data.error.message}`));
        } else {
          pending.resolve(data.result);
        }
      }
    } catch (e) {
      console.error('[useRpcSocket] Failed to parse message:', event.data, e);
    }
  };

  ws.onclose = () => {
    notifyState('closed');
    globalWs = null;
    while (pendingQueue.length > 0) {
      const pending = pendingQueue.shift()!;
      pending.reject(new Error('WebSocket closed'));
    }

    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
      reconnectTimeout = setTimeout(() => {
        connectSocket(url);
      }, delay);
    }
  };

  ws.onerror = () => {
    notifyState('error');
  };

  globalWs = ws;
}

export function useRpcSocket(url: string) {
  const [readyState, setReadyState] = useState<ReadyState>(globalReadyState);

  useEffect(() => {
    stateListeners.add(setReadyState);
    if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
      connectSocket(url);
    }
    return () => {
      stateListeners.delete(setReadyState);
    };
  }, [url]);

  const sendRequest = useCallback((method: string, params: unknown[]): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const ws = globalWs;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const id = requestId++;
      pendingQueue.push({ resolve, reject });
      const request: JsonRpcRequest = { jsonrpc: '2.0', method, params, id };
      ws.send(JSON.stringify(request));
    });
  }, []);

  const sendNotification = useCallback((method: string, params: unknown[]): void => {
    const ws = globalWs;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[useRpcSocket] Cannot send notification, socket not open');
      return;
    }
    const request: JsonRpcRequest = { jsonrpc: '2.0', method, params };
    ws.send(JSON.stringify(request));
  }, []);

  return { readyState, sendRequest, sendNotification };
}
