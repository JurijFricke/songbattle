import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HallOfFame from "./HallOfFame";

describe("HallOfFame", () => {
  it("shows bracket wins separately from match wins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              songId: "4uLU6hMCjMI75M1A2tKUQC",
              title: "Example Song",
              artists: ["Example Artist"],
              wins: 5,
              losses: 2,
              appearances: 7,
              bracketWins: 2,
              bracketAppearances: 3,
              winRate: 5 / 7,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(<HallOfFame />);

    expect(
      await screen.findByText(/2 brackets · 5 match wins/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /top 10 by brackets won/i }),
    ).toBeInTheDocument();
  });
});
