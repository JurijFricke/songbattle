import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameProvider } from "../context/GameContext";
import StartMenu from "./StartMenu";

describe("StartMenu", () => {
  it("exposes labeled source controls and a semantic submit action", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(
      <GameProvider>
        <StartMenu />
      </GameProvider>,
    );

    expect(screen.getByRole("form")).toHaveAccessibleName("Choose your battle");
    expect(screen.getByLabelText(/number of songs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spotify playlist url/i)).toHaveAttribute(
      "name",
      "playlistUrl",
    );
    expect(
      screen.getByRole("button", { name: /start battle/i }),
    ).toHaveAttribute("type", "submit");
  });
});
