import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StoryCard } from "@/components/story/StoryCard";

const story = {
  title: "Leo and the Magic Meadow",
  content: "Once upon a time...",
  imageUrl: "https://example.com/image.jpg",
  audioUrl: "https://example.com/audio.mp3",
  fontFamily: "Bubblegum Sans",
  voiceName: "Rachel",
  sourceDomain: "nationalgeographic.com",
  slug: "leo-and-magic-meadow",
};

describe("StoryCard", () => {
  it("renders the story title", () => {
    render(<StoryCard story={story} isAuthenticated={false} />);
    expect(screen.getAllByText("Leo and the Magic Meadow").length).toBeGreaterThan(0);
  });

  it("renders the story content", () => {
    render(<StoryCard story={story} isAuthenticated={false} />);
    expect(screen.getByText(/once upon a time/i)).toBeInTheDocument();
  });

  it("renders the source domain", () => {
    render(<StoryCard story={story} isAuthenticated={false} />);
    expect(screen.getByText(/nationalgeographic\.com/)).toBeInTheDocument();
  });

  it("shows SaveStoryBanner for guest", () => {
    render(<StoryCard story={story} isAuthenticated={false} />);
    expect(screen.getByText(/want to keep this story/i)).toBeInTheDocument();
  });

  it("shows saved badge for signed-in user", () => {
    render(<StoryCard story={story} isAuthenticated={true} />);
    expect(screen.getByText(/saved to your library/i)).toBeInTheDocument();
    expect(screen.queryByText(/want to keep this story/i)).not.toBeInTheDocument();
  });

  it("image has descriptive alt text", () => {
    render(<StoryCard story={story} isAuthenticated={false} />);
    expect(screen.getByRole("img", { name: story.title })).toBeInTheDocument();
  });
});
