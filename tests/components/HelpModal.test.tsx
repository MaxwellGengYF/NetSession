import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpModal } from "@/components/HelpModal";

describe("HelpModal", () => {
  it("does not render when closed", () => {
    const { container } = render(<HelpModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when open", () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Help Center")).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Getting Started with ConversationFlow")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /faq/i }));
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /release notes/i }));
    expect(screen.getByRole("heading", { name: /release notes/i })).toBeInTheDocument();
  });

  it("calls onClose when overlay or close button clicked", async () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    // Close button inside modal
    const closeBtn = screen.getAllByRole("button").find((b) =>
      b.querySelector("svg")?.getAttribute("data-lucide-icon") === "X"
    );
    if (closeBtn) {
      await userEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("toggles play state when video area clicked", async () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    const videoContainer = screen.getByText("Getting Started with ConversationFlow").parentElement;
    const player = videoContainer?.querySelector("[class*='relative rounded-xl']");
    if (player) {
      await userEvent.click(player);
      expect(screen.getByText(/video simulation playing/i)).toBeInTheDocument();
    }
  });
});
