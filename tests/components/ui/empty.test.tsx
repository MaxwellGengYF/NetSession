import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";

describe("Empty compound components", () => {
  it("renders Empty with children", () => {
    render(
      <Empty data-testid="empty">
        <EmptyHeader>
          <EmptyTitle>Title</EmptyTitle>
          <EmptyDescription>Desc</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>Content</EmptyContent>
        <EmptyMedia>Icon</EmptyMedia>
      </Empty>
    );
    expect(screen.getByTestId("empty")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Icon")).toBeInTheDocument();
  });
});
