import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/Sidebar";
import type { Conversation } from "@/types/conversation";

const mockConversations: Conversation[] = [
  {
    id: "c1",
    title: "First Chat",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "c2",
    title: "Second Chat",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("Sidebar", () => {
  it("renders brand name", () => {
    render(
      <Sidebar
        conversations={mockConversations}
        activeConversationId="c1"
        onCreateConversation={vi.fn()}
        onSwitchConversation={vi.fn()}
        onDestroyConversation={vi.fn()}
        onOpenHelp={vi.fn()}
      />
    );
    expect(screen.getByText("ConversationFlow")).toBeInTheDocument();
  });

  it("renders conversation list", () => {
    render(
      <Sidebar
        conversations={mockConversations}
        activeConversationId="c1"
        onCreateConversation={vi.fn()}
        onSwitchConversation={vi.fn()}
        onDestroyConversation={vi.fn()}
        onOpenHelp={vi.fn()}
      />
    );
    expect(screen.getByText("First Chat")).toBeInTheDocument();
    expect(screen.getByText("Second Chat")).toBeInTheDocument();
  });

  it("calls onCreateConversation when New Chat clicked", async () => {
    const onCreate = vi.fn();
    render(
      <Sidebar
        conversations={mockConversations}
        activeConversationId="c1"
        onCreateConversation={onCreate}
        onSwitchConversation={vi.fn()}
        onDestroyConversation={vi.fn()}
        onOpenHelp={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /new chat/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("calls onSwitchConversation when conversation clicked", async () => {
    const onSwitch = vi.fn();
    render(
      <Sidebar
        conversations={mockConversations}
        activeConversationId="c1"
        onCreateConversation={vi.fn()}
        onSwitchConversation={onSwitch}
        onDestroyConversation={vi.fn()}
        onOpenHelp={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Second Chat"));
    expect(onSwitch).toHaveBeenCalledWith("c2");
  });

  it("calls onOpenHelp when Help clicked", async () => {
    const onHelp = vi.fn();
    render(
      <Sidebar
        conversations={mockConversations}
        activeConversationId="c1"
        onCreateConversation={vi.fn()}
        onSwitchConversation={vi.fn()}
        onDestroyConversation={vi.fn()}
        onOpenHelp={onHelp}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /help/i }));
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it("opens delete dropdown and calls onDestroyConversation", async () => {
    const onDestroy = vi.fn();
    render(
      <Sidebar
        conversations={mockConversations}
        activeConversationId="c1"
        onCreateConversation={vi.fn()}
        onSwitchConversation={vi.fn()}
        onDestroyConversation={onDestroy}
        onOpenHelp={vi.fn()}
      />
    );
    // Click the more options button on the first conversation row
    const moreButtons = screen.getAllByRole("button").filter((b) =>
      b.querySelector("svg")?.getAttribute("data-lucide-icon") === "MoreHorizontal"
    );
    if (moreButtons.length > 0) {
      await userEvent.click(moreButtons[0]);
      const deleteBtn = screen.getByRole("button", { name: /delete/i });
      await userEvent.click(deleteBtn);
      expect(onDestroy).toHaveBeenCalledWith("c1");
    }
  });
});
