import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenerationProgress } from "@/components/generator/GenerationProgress";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: "WRITING", step: 2, totalSteps: 4, stepLabel: "Writing your story", error: null, storyUrl: null, slug: null }),
  }));
});

describe("GenerationProgress", () => {
  it("renders all 4 step labels", () => {
    render(
      <GenerationProgress storyId="abc" onComplete={vi.fn()} onError={vi.fn()} />
    );
    expect(screen.getByText(/scraping website/i)).toBeInTheDocument();
    expect(screen.getByText(/writing your story/i)).toBeInTheDocument();
    expect(screen.getByText(/painting the illustration/i)).toBeInTheDocument();
    expect(screen.getByText(/recording narration/i)).toBeInTheDocument();
  });

  it("renders the progress bar", () => {
    render(
      <GenerationProgress storyId="abc" onComplete={vi.fn()} onError={vi.fn()} />
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
