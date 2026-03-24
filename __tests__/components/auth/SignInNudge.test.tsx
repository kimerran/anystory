import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SignInNudge } from "@/components/auth/SignInNudge";

describe("SignInNudge", () => {
  it("renders sign-in link", () => {
    render(<SignInNudge />);
    const link = screen.getByRole("link", { name: /sign in with google/i });
    expect(link).toHaveAttribute("href", "/signin");
  });
});
