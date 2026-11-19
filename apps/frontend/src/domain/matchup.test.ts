import { describe, expect, it } from "vitest";
import { sessionMatchupNumber } from "./matchup";

describe("sessionMatchupNumber", () => {
  it("numbers a 16-song bracket continuously across rounds", () => {
    expect(sessionMatchupNumber(16, 16, 0)).toBe(1);
    expect(sessionMatchupNumber(16, 16, 14)).toBe(8);
    expect(sessionMatchupNumber(16, 8, 0)).toBe(9);
    expect(sessionMatchupNumber(16, 8, 6)).toBe(12);
    expect(sessionMatchupNumber(16, 4, 0)).toBe(13);
    expect(sessionMatchupNumber(16, 4, 2)).toBe(14);
    expect(sessionMatchupNumber(16, 2, 0)).toBe(15);
  });

  it("rejects progress that cannot come from a bracket", () => {
    expect(() => sessionMatchupNumber(16, 8, 1)).toThrow(RangeError);
    expect(() => sessionMatchupNumber(16, 8, 8)).toThrow(RangeError);
    expect(() => sessionMatchupNumber(8, 16, 0)).toThrow(RangeError);
  });
});
