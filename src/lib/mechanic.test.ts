import { calculateTargetStreak, OVERLEARNING_LEVEL, TARGET_FLOOR } from './mechanic';

describe('lib/mechanic calculateTargetStreak [Story 2.1, R1]', () => {
  it('returns the floor at zero incorrect', () => {
    expect(calculateTargetStreak(0)).toBe(5);
  });

  // Boundary table from the Mechanic Specification: the floor governs until
  // total_incorrect_this_session exceeds 10 (comparison is > 10, not >= 10).
  it.each([
    [0, 5],
    [1, 5],
    [9, 5],
    [10, 5], // formula yields 5; ties the floor
    [11, 6], // first observable raise
    [12, 6],
    [13, 7],
  ])('total_incorrect_this_session=%i -> target_streak=%i', (totalIncorrect, expected) => {
    expect(calculateTargetStreak(totalIncorrect)).toBe(expected);
  });

  it('never returns below TARGET_FLOOR regardless of input', () => {
    expect(calculateTargetStreak(0)).toBeGreaterThanOrEqual(TARGET_FLOOR);
    expect(calculateTargetStreak(1)).toBeGreaterThanOrEqual(TARGET_FLOOR);
  });

  it('constants match the Mechanic Specification', () => {
    expect(TARGET_FLOOR).toBe(5);
    expect(OVERLEARNING_LEVEL).toBe(0.5);
  });

  it('falls back to the floor for a non-finite input instead of soft-locking [Review][Patch]', () => {
    // Reachable only through a corrupted-but-typeof-number session read;
    // without this, a non-finite target makes currentStreak >= targetStreak
    // permanently false.
    expect(calculateTargetStreak(NaN)).toBe(TARGET_FLOOR);
    expect(calculateTargetStreak(Infinity)).toBe(TARGET_FLOOR);
    expect(calculateTargetStreak(-Infinity)).toBe(TARGET_FLOOR);
  });
});
