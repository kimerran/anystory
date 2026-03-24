import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AudioPlayer } from "@/components/story/AudioPlayer";

describe("AudioPlayer", () => {
  const props = {
    audioUrl: "https://example.com/story.mp3",
    title: "Leo and the Magic Meadow",
    narratorName: "Rachel",
  };

  it("renders play button", () => {
    render(<AudioPlayer {...props} />);
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });

  it("does not autoplay", () => {
    render(<AudioPlayer {...props} />);
    const audio = document.querySelector("audio");
    expect(audio?.autoplay).toBeFalsy();
  });

  it("renders narrator name", () => {
    render(<AudioPlayer {...props} />);
    expect(screen.getByText(/rachel/i)).toBeInTheDocument();
  });
});
