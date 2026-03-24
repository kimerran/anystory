import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UrlForm } from "@/components/generator/UrlForm";

describe("UrlForm", () => {
  it("renders the URL input", () => {
    render(<UrlForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
  });

  it("shows validation error for empty submit", async () => {
    render(<UrlForm onSubmit={vi.fn()} isLoading={false} />);
    await userEvent.click(screen.getByRole("button", { name: /generate/i }));
    expect(await screen.findByText(/valid url/i)).toBeInTheDocument();
  });

  it("calls onSubmit with url, voiceId, fontName on valid submit", async () => {
    const onSubmit = vi.fn();
    render(<UrlForm onSubmit={onSubmit} isLoading={false} />);
    await userEvent.type(
      screen.getByPlaceholderText(/https:\/\//i),
      "https://example.com"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ url: "https://example.com" })
      );
    });
  });

  it("shows SignInNudge when not authenticated", () => {
    render(<UrlForm onSubmit={vi.fn()} isLoading={false} isAuthenticated={false} />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  it("hides SignInNudge when authenticated", () => {
    render(<UrlForm onSubmit={vi.fn()} isLoading={false} isAuthenticated={true} />);
    expect(screen.queryByText(/sign in with google/i)).not.toBeInTheDocument();
  });

  it("disables submit button while loading", () => {
    render(<UrlForm onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });
});
