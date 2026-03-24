import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserNav } from "@/components/ui/UserNav";

describe("UserNav — guest", () => {
  it("shows Sign In button when no session", () => {
    render(<UserNav session={null} />);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});

describe("UserNav — signed in", () => {
  const session = {
    user: { id: "1", name: "Sarah", email: "sarah@example.com", image: null },
    expires: "2099-01-01",
  };

  it("shows user's name", () => {
    render(<UserNav session={session} />);
    expect(screen.getByText("Sarah")).toBeInTheDocument();
  });

  it("shows avatar with first initial", () => {
    render(<UserNav session={session} />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
