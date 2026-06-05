import { describe, expect, it } from 'vitest';
import { getBandRevealPlan, getBandScrollOffset } from '@/navigation/tree-map-focus';

describe('tree map focus', () => {
  it('focuses the active band into the lower-middle play area', () => {
    expect(getBandScrollOffset({ bandIndex: 0, bandHeight: 520, focusInset: 180 })).toBe(0);
    expect(getBandScrollOffset({ bandIndex: 2, bandHeight: 520, focusInset: 180 })).toBe(860);
  });

  it('builds a reveal plan only when clearing the end of a band unlocks the next level', () => {
    expect(getBandRevealPlan({ currentLevelId: 5, unlockedLevel: 6 })).toEqual({
      revealBandStartLevel: 6,
      focusLevel: 6,
    });
    expect(getBandRevealPlan({ currentLevelId: 4, unlockedLevel: 5 })).toBeNull();
    expect(getBandRevealPlan({ currentLevelId: 5, unlockedLevel: 5 })).toBeNull();
  });
});
