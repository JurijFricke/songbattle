import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Song } from "@songbattle/contracts";
import SpotifyPlayer from "./SpotifyPlayer";

const song: Song = {
  id: "4uLU6hMCjMI75M1A2tKUQC",
  title: "Example Song",
  artists: ["Example Artist"],
  album: { name: "Example Album" },
  durationMs: 180_000,
  popularity: 50,
  spotify: {
    provider: "spotify",
    contentType: "track",
    spotifyId: "4uLU6hMCjMI75M1A2tKUQC",
    spotifyUri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    embedUrl:
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0",
  },
};

describe("SpotifyPlayer", () => {
  it("renders the official Spotify Embed with an accessible title", () => {
    render(<SpotifyPlayer song={song} />);

    const player = screen.getByTitle(
      "Spotify player for Example Song by Example Artist",
    );
    expect(player).toHaveAttribute("src", song.spotify.embedUrl);
    expect(player).toHaveAttribute("allowfullscreen");
    expect(player).toHaveAttribute("loading", "lazy");
  });
});
