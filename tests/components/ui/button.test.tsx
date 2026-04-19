import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button", { name: /click/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("supports asChild", () => {
    render(
      <Button asChild>
        <a href="/">Link</a>
      </Button>
    );
    expect(screen.getByRole("link", { name: /link/i })).toBeInTheDocument();
  });

  it("buttonVariants returns string classes", () => {
    expect(buttonVariants({ variant: "destructive", size: "sm" })).toBeTypeOf("string");
  });
});
