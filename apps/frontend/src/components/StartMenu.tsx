import { useState, type FormEvent } from "react";
import { decadeSchema, type BattleSource } from "@songbattle/contracts";
import { useGame } from "../context/useGame";
import Accordion from "./Accordion";
import HallOfFame from "./HallOfFame";
import styles from "./StartMenu.module.css";

const bracketSizes = [16, 32, 64, 128, 256] as const;

const StartMenu = () => {
  const { startGame } = useGame();
  const [songCount, setSongCount] = useState<(typeof bracketSizes)[number]>(16);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [decade, setDecade] = useState("any");
  const [genre, setGenre] = useState("any");

  const buildSource = (): BattleSource => {
    if (playlistUrl.trim())
      return { type: "playlist", playlistUrl: playlistUrl.trim() };
    if (decade !== "any")
      return { type: "decade", decade: decadeSchema.parse(decade) };
    if (genre !== "any") return { type: "genre", genre };
    return { type: "random" };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    startGame(songCount, buildSource());
  };

  const hasPlaylist = playlistUrl.trim().length > 0;
  const hasDecade = decade !== "any";

  return (
    <div className={styles.menuLayout}>
      <section className={styles.startCard} aria-labelledby="start-heading">
        <p className={styles.cardEyebrow}>Build your bracket</p>
        <h2 id="start-heading">Choose your battle</h2>
        <p className={styles.intro}>
          Pick a pool, then listen to both contenders before you vote.
        </p>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          aria-labelledby="start-heading"
        >
          <fieldset className={styles.fieldset}>
            <legend>Bracket size</legend>
            <label className={styles.field} htmlFor="song-count">
              <span>Number of songs</span>
              <select
                id="song-count"
                name="songCount"
                value={songCount}
                onChange={(event) =>
                  setSongCount(
                    Number(event.target.value) as (typeof bracketSizes)[number],
                  )
                }
                className={styles.control}
              >
                {bracketSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Song source</legend>
            <label className={styles.field} htmlFor="playlist-url">
              <span>
                Spotify playlist URL <small>(optional)</small>
              </span>
              <input
                id="playlist-url"
                name="playlistUrl"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={playlistUrl}
                onChange={(event) => setPlaylistUrl(event.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className={styles.control}
                aria-describedby="playlist-help"
              />
            </label>
            <p id="playlist-help" className={styles.helpText}>
              Use a playlist to battle tracks from a collection you already
              love.
            </p>

            <label className={styles.field} htmlFor="decade-select">
              <span>
                Decade <small>(optional)</small>
              </span>
              <select
                id="decade-select"
                name="decade"
                value={decade}
                onChange={(event) => setDecade(event.target.value)}
                className={styles.control}
                disabled={hasPlaylist}
              >
                <option value="any">Any decade</option>
                <option value="2020s">2020s</option>
                <option value="2010s">2010s</option>
                <option value="2000s">2000s</option>
                <option value="1990s">1990s</option>
                <option value="1980s">1980s</option>
                <option value="1970s">1970s</option>
              </select>
            </label>

            <label className={styles.field} htmlFor="genre-select">
              <span>
                Genre <small>(optional)</small>
              </span>
              <select
                id="genre-select"
                name="genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                className={styles.control}
                disabled={hasPlaylist || hasDecade}
              >
                <option value="any">Any genre</option>
                <option value="pop">Pop</option>
                <option value="rock">Rock</option>
                <option value="indie">Indie</option>
                <option value="hip-hop">Hip-hop</option>
                <option value="r-n-b">R&amp;B</option>
                <option value="alternative">Alternative</option>
                <option value="dance">Dance</option>
                <option value="metal">Metal</option>
                <option value="german">German</option>
              </select>
            </label>
          </fieldset>

          <button type="submit" className={styles.startGameButton}>
            Start battle
          </button>
        </form>
      </section>

      <aside className={styles.hallOfFame} aria-label="Hall of Fame">
        <Accordion title="Hall of Fame">
          <HallOfFame />
        </Accordion>
      </aside>
    </div>
  );
};

export default StartMenu;
