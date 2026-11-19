/**
 * Returns the session-wide matchup number for the current bracket position.
 *
 * A session stores one vote per matchup number, so the number must keep
 * increasing across rounds. Using the index within the current round would
 * restart at 1 every round and make later votes look like duplicates.
 */
export const sessionMatchupNumber = (
  initialSongCount: number,
  remainingSongCount: number,
  currentBattleIndex: number,
): number => {
  const validProgress =
    Number.isInteger(initialSongCount) &&
    Number.isInteger(remainingSongCount) &&
    Number.isInteger(currentBattleIndex) &&
    initialSongCount >= remainingSongCount &&
    remainingSongCount > 0 &&
    currentBattleIndex >= 0 &&
    currentBattleIndex % 2 === 0 &&
    currentBattleIndex < remainingSongCount;

  if (!validProgress) {
    throw new RangeError("Invalid bracket progress.");
  }

  return initialSongCount - remainingSongCount + currentBattleIndex / 2 + 1;
};
