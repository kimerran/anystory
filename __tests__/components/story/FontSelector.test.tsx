import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FontSelector } from "@/components/story/FontSelector";
import { STORY_FONTS } from "@/lib/fonts";

describe("FontSelector", () => {
  it("renders the selected font name", () => {
    render(<FontSelector value={STORY_FONTS[0]!.name} onChange={vi.fn()} />);
    expect(screen.getByText("Bubblegum Sans")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<FontSelector value={STORY_FONTS[0]!.name} onChange={vi.fn()} />);
    expect(screen.getByText(/playful/i)).toBeInTheDocument();
  });
});
