import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/pages/Home";

describe("Home page", () => {
  it("renders heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /vite \+ react/i })).toBeInTheDocument();
  });

  it("increments count on button click", async () => {
    render(<Home />);
    const button = screen.getByRole("button", { name: /count is 0/i });
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: /count is 1/i })).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: /count is 2/i })).toBeInTheDocument();
  });
});
