import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useKimixSSE, disconnectEventSource } from "@/hooks/useKimixSSE";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url = "";
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  static reset() {
    MockEventSource.instances = [];
  }

  // Test helper to simulate receiving data
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) this.onopen();
  }

  simulateError() {
    if (this.onerror) this.onerror();
  }
}

vi.stubGlobal("EventSource", MockEventSource);

describe("useKimixSSE", () => {
  beforeEach(() => {
    MockEventSource.reset();
    disconnectEventSource();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    disconnectEventSource();
    vi.useRealTimers();
  });

  it("connects on mount and reports open state", async () => {
    const { result } = renderHook(() => useKimixSSE());
    expect(result.current.connectionState).toBe("connecting");

    const es = MockEventSource.instances[0];
    act(() => es.simulateOpen());
    expect(result.current.connectionState).toBe("open");
  });

  it("subscribes to session-scoped events", async () => {
    const { result } = renderHook(() => useKimixSSE());
    const es = MockEventSource.instances[0];
    act(() => es.simulateOpen());

    const cb = vi.fn();
    let unsub: (() => void) | undefined;
    act(() => {
      unsub = result.current.subscribe("sess-1", cb);
    });

    act(() =>
      es.simulateMessage(
        JSON.stringify({ type: "message.part.updated", properties: { sessionID: "sess-1", delta: "hi" } })
      )
    );

    await waitFor(() => expect(cb).toHaveBeenCalled());
    expect(cb.mock.calls[0][0].type).toBe("message.part.updated");

    act(() => unsub && unsub());
  });

  it("ignores events for other sessions", async () => {
    const { result } = renderHook(() => useKimixSSE());
    const es = MockEventSource.instances[0];
    act(() => es.simulateOpen());

    const cb = vi.fn();
    act(() => {
      result.current.subscribe("sess-a", cb);
    });

    act(() =>
      es.simulateMessage(
        JSON.stringify({ type: "message.part.updated", properties: { sessionID: "sess-b", delta: "x" } })
      )
    );

    expect(cb).not.toHaveBeenCalled();
  });

  it("global subscribers receive all events", async () => {
    const { result } = renderHook(() => useKimixSSE());
    const es = MockEventSource.instances[0];
    act(() => es.simulateOpen());

    const cb = vi.fn();
    let unsub: (() => void) | undefined;
    act(() => {
      unsub = result.current.subscribeGlobal(cb);
    });

    act(() =>
      es.simulateMessage(
        JSON.stringify({ type: "session.created", properties: { sessionID: "s1" } })
      )
    );

    await waitFor(() => expect(cb).toHaveBeenCalled());
    act(() => unsub && unsub());
  });

  it("reconnects after error with exponential backoff", async () => {
    const { result } = renderHook(() => useKimixSSE());
    const es1 = MockEventSource.instances[0];
    act(() => es1.simulateOpen());

    act(() => es1.simulateError());
    expect(result.current.connectionState).toBe("error");

    // Advance past first reconnect delay (2000ms)
    act(() => vi.advanceTimersByTime(3000));
    expect(MockEventSource.instances.length).toBe(2);
  });

  it("gives up after max reconnect attempts", async () => {
    const { result } = renderHook(() => useKimixSSE());
    const es = MockEventSource.instances[0];
    act(() => es.simulateOpen());

    // Simulate errors on each new instance created by reconnect
    // maxReconnectAttempts = 3, so we need 4 errors to exhaust retries
    for (let i = 0; i < 4; i++) {
      const currentEs = MockEventSource.instances[i];
      if (currentEs) {
        act(() => currentEs.simulateError());
      }
      act(() => vi.advanceTimersByTime(11000));
    }

    await waitFor(() => expect(result.current.connectionState).toBe("closed"));
  });

  it("reconnect resets attempts", async () => {
    const { result } = renderHook(() => useKimixSSE());
    act(() => result.current.reconnect());
    expect(MockEventSource.instances.length).toBeGreaterThanOrEqual(1);
  });
});
