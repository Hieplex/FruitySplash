import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '@/state/progress-helpers';
import {
  TREE_LEVELS_PER_BAND,
  buildTreeBands,
  getTreeBandIndexForLevel,
  getTreeBandLevelRange,
} from '@/navigation/tree-map-model';

describe('tree map model', () => {
  it('groups levels into 5-level bands', () => {
    expect(TREE_LEVELS_PER_BAND).toBe(5);
    expect(getTreeBandIndexForLevel(1)).toBe(0);
    expect(getTreeBandIndexForLevel(5)).toBe(0);
    expect(getTreeBandIndexForLevel(6)).toBe(1);
    expect(getTreeBandIndexForLevel(0)).toBe(0);
    expect(getTreeBandIndexForLevel(-3)).toBe(0);
    expect(getTreeBandIndexForLevel(6.9)).toBe(1);
    expect(getTreeBandIndexForLevel(Number.POSITIVE_INFINITY)).toBe(0);
    expect(getTreeBandIndexForLevel(Number.NaN)).toBe(0);
    expect(getTreeBandLevelRange(0)).toEqual({ startLevel: 1, endLevel: 5 });
    expect(getTreeBandLevelRange(1)).toEqual({ startLevel: 6, endLevel: 10 });
    expect(getTreeBandLevelRange(-2)).toEqual({ startLevel: 1, endLevel: 5 });
    expect(getTreeBandLevelRange(1.8)).toEqual({ startLevel: 6, endLevel: 10 });
    expect(getTreeBandLevelRange(Number.POSITIVE_INFINITY)).toEqual({ startLevel: 1, endLevel: 5 });
    expect(getTreeBandLevelRange(Number.NaN)).toEqual({ startLevel: 1, endLevel: 5 });
  });

  it('maps completed, current, and locked states from unlocked progress and teases the next band', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 3,
      starsByLevel: { 1: 3, 2: 1 },
    };

    const bands = buildTreeBands(progress, 10);

    expect(bands).toHaveLength(2);
    expect(bands[0]).toMatchObject({
      bandIndex: 0,
      startLevel: 1,
      endLevel: 5,
      teaseVisible: false,
    });
    expect(bands[0].levels).toEqual([
      { levelId: 1, state: 'completed' },
      { levelId: 2, state: 'completed' },
      { levelId: 3, state: 'current' },
      { levelId: 4, state: 'locked' },
      { levelId: 5, state: 'locked' },
    ]);
    expect(bands[1].teaseVisible).toBe(true);
    expect(bands[1].levels.every((level) => level.state === 'locked')).toBe(true);
  });

  it('clamps invalid maxLevel values to a safe single-level band', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 1,
    };

    expect(buildTreeBands(progress, 0)).toEqual([
      {
        bandIndex: 0,
        startLevel: 1,
        endLevel: 1,
        teaseVisible: false,
        levels: [{ levelId: 1, state: 'current' }],
      },
    ]);

    expect(buildTreeBands(progress, 3.8)).toEqual([
      {
        bandIndex: 0,
        startLevel: 1,
        endLevel: 3,
        teaseVisible: false,
        levels: [
          { levelId: 1, state: 'current' },
          { levelId: 2, state: 'locked' },
          { levelId: 3, state: 'locked' },
        ],
      },
    ]);

    expect(buildTreeBands(progress, Number.NaN)).toEqual([
      {
        bandIndex: 0,
        startLevel: 1,
        endLevel: 1,
        teaseVisible: false,
        levels: [{ levelId: 1, state: 'current' }],
      },
    ]);
  });
});
