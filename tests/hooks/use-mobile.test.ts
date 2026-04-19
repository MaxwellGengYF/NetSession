import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

const MOBILE_BREAKPOINT = 768;

describe("useIsMobile", () => {
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];

  beforeEach(() => {
    listeners = [];
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string): MediaQueryList => {
        const matches = query.includes(`${MOBILE_BREAKPOINT - 1}`)
          ? window.innerWidth < MOBILE_BREAKPOINT
          : false;
        return {
          matches,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: (_event: string, cb: (e: MediaQueryListEvent) => void) => {
            listeners.push(cb);
          },
          removeEventListener: (_event: string, cb: (e: MediaQueryListEvent) => void) => {
            listeners = listeners.filter((l) => l !== cb);
          },
          dispatchEvent: () => false,
        } as unknown as MediaQueryList;
      },
    });
  });

  afterEach(() => {
    listeners = [];
  });

  it("returns false when window width is above breakpoint", () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true when window width is below breakpoint", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when matchMedia change event fires", async () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    window.innerWidth = 500;
    const event = new Event("change") as unknown as MediaQueryListEvent;
    act(() => {
      listeners.forEach((cb) => cb(event));
    });
    await waitFor(() => expect(result.current).toBe(true));
  });
});
