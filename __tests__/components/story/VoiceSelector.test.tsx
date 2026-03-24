import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { VoiceSelector } from "@/components/story/VoiceSelector";
import { VOICES } from "@/lib/voices";

describe("VoiceSelector", () => {
  it("renders the selected voice name", () => {
    render(<VoiceSelector value={VOICES[0]!.id} onChange={vi.fn()} />);
    expect(screen.getByText("Rachel")).toBeInTheDocument();
  });

  it("renders the description of the selected voice", () => {
    render(<VoiceSelector value={VOICES[0]!.id} onChange={vi.fn()} />);
    expect(screen.getByText(/warm, calm/i)).toBeInTheDocument();
  });
});
