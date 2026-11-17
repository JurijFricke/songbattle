import type { Song } from "@songbattle/contracts";
import styles from "./SpotifyPlayer.module.css";

interface SpotifyPlayerProps {
  song: Song;
}

const SpotifyPlayer = ({ song }: SpotifyPlayerProps) => (
  <iframe
    className={styles.player}
    src={song.spotify.embedUrl}
    title={`Spotify player for ${song.title} by ${song.artists.join(", ")}`}
    loading="lazy"
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    allowFullScreen
  />
);

export default SpotifyPlayer;
