import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

Element.prototype.scrollIntoView = vi.fn();

// Global EventSource mock for tests that don't explicitly mock useKimixSSE
globalThis.EventSource = class MockEventSource {
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
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }
  close() {
    this.readyState = MockEventSource.CLOSED;
  }
} as unknown as typeof EventSource;

afterEach(() => {
  cleanup();
});
