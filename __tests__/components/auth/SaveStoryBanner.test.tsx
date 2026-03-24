import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SaveStoryBanner } from "@/components/auth/SaveStoryBanner";

describe("SaveStoryBanner", () => {
  it("renders save prompt text", () => {
    render(<SaveStoryBanner />);
    expect(screen.getByText(/want to keep this story/i)).toBeInTheDocument();
  });

  it("save button links to /signin", () => {
    render(<SaveStoryBanner />);
    const btn = screen.getByRole("link", { name: /save story/i });
    expect(btn).toHaveAttribute("href", "/signin");
  });
});
