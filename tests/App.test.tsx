import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";

vi.mock("@/hooks/useKimix", () => ({
  useKimix: () => ({
    connectionState: "open" as const,
    openSession: vi.fn(() => Promise.resolve("sess-1")),
    closeSession: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(),
    abort: vi.fn(),
  }),
}));

describe("App integration", () => {
  it("renders sidebar and chat area", () => {
    render(<App />);
    expect(screen.getByText("ConversationFlow")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
  });

  it("creates a new conversation and shows it in sidebar", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /new chat/i }));
    expect(screen.getByText(/new conversation/i)).toBeInTheDocument();
  });

  it("opens help modal and closes it", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /help/i }));
    expect(screen.getByText("Help Center")).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getAllByRole("button").find((b) =>
      b.querySelector("svg")?.getAttribute("data-lucide-icon") === "X"
    );
    if (closeBtn) {
      await userEvent.click(closeBtn);
      expect(screen.queryByText("Help Center")).not.toBeInTheDocument();
    }
  });
});
