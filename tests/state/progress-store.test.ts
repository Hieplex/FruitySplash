import { describe, expect, it } from 'vitest';
import {
  applyLevelCompletion,
  consumeBooster,
  createDefaultProgress,
  getCompletedLevelCountFromStart,
  getCompletedLevelCountInRange,
  getLevelStars,
  getLastCompletedLevelIdFromStart,
  getPlayableLevelId,
  hasCompletedLevel,
  hasCompletedLevelRange,
  isLevelUnlocked,
  sanitizeProgressState,
} from '@/state/progress-helpers';

describe('progress store helpers', () => {
  it('starts with level 1 unlocked and sound enabled', () => {
    expect(createDefaultProgress()).toEqual({
      unlockedLevel: 1,
      starsByLevel: {},
      bestScoreByLevel: {},
      soundEnabled: true,
      wallet: { coins: 0 },
      inventory: { boosters: { bomb: 5, hammer: 5 } },
      lives: { current: 5, max: 5 },
      rewardClaims: { levelFirstClear: {} },
    });
  });

  it('unlocks the next level and grants first-clear coins once', () => {
    const progress = createDefaultProgress();
    const next = applyLevelCompletion(progress, 1, 2200, 2);
    const upgraded = applyLevelCompletion(next, 1, 2600, 3);

    expect(next.unlockedLevel).toBe(2);
    expect(next.wallet.coins).toBe(50);
    expect(upgraded.wallet.coins).toBe(50);
    expect(getLevelStars(upgraded, 1)).toBe(3);
    expect(upgraded.bestScoreByLevel[1]).toBe(2600);
    expect(isLevelUnlocked(upgraded, 2)).toBe(true);
  });

  it('caps first-clear coin rewards at the wallet maximum', () => {
    const progress = {
      ...createDefaultProgress(),
      wallet: { coins: 999980 },
    };
    const next = applyLevelCompletion(progress, 1, 2200, 2);

    expect(next.wallet.coins).toBe(999999);
  });

  it('consumes booster inventory only when available', () => {
    const progress = {
      ...createDefaultProgress(),
      inventory: { boosters: { bomb: 1, hammer: 5 } },
    };
    const first = consumeBooster(progress, 'bomb');
    const second = consumeBooster(first.state, 'bomb');

    expect(first.consumed).toBe(true);
    expect(first.state.inventory.boosters.bomb).toBe(0);
    expect(second.consumed).toBe(false);
    expect(second.state.inventory.boosters.bomb).toBe(0);
  });

  it('resolves invalid or locked level ids to a playable level', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 3,
    };

    expect(getPlayableLevelId(progress, 2, [1, 2, 3, 4])).toBe(2);
    expect(getPlayableLevelId(progress, 4, [1, 2, 3, 4])).toBe(3);
    expect(getPlayableLevelId(progress, 999, [1, 2, 3, 4])).toBe(3);
  });

  it('checks level completion by finished levels, not just unlock progress', () => {
    const unlockedOnly = {
      ...createDefaultProgress(),
      unlockedLevel: 6,
    };

    expect(hasCompletedLevel(unlockedOnly, 1)).toBe(false);
    expect(getCompletedLevelCountInRange(unlockedOnly, 1, 5)).toBe(0);
    expect(hasCompletedLevelRange(unlockedOnly, 1, 5)).toBe(false);
    expect(getCompletedLevelCountFromStart(unlockedOnly)).toBe(0);
    expect(getLastCompletedLevelIdFromStart(unlockedOnly)).toBe(1);

    const completedBand = applyLevelCompletion(
      applyLevelCompletion(
        applyLevelCompletion(applyLevelCompletion(applyLevelCompletion(createDefaultProgress(), 1, 1000, 1), 2, 1000, 1), 3, 1000, 1),
        4,
        1000,
        1,
      ),
      5,
      1000,
      1,
    );

    expect(getCompletedLevelCountInRange(completedBand, 1, 5)).toBe(5);
    expect(hasCompletedLevelRange(completedBand, 1, 5)).toBe(true);
    expect(getCompletedLevelCountFromStart(completedBand)).toBe(5);
    expect(getLastCompletedLevelIdFromStart(completedBand)).toBe(5);
  });

  it('sanitizes persisted progress before using it', () => {
    expect(
      sanitizeProgressState({
        unlockedLevel: 2.9,
        starsByLevel: { 1: 3, bad: 2, 2: -1 },
        bestScoreByLevel: { 1: 2500, 3: 'wrong' },
        soundEnabled: false,
        wallet: { coins: 1000000.8 },
        inventory: { boosters: { bomb: 2.9, hammer: 4.5 } },
        rewardClaims: { levelFirstClear: { 1: true, bad: true, 2: false } },
      }),
    ).toEqual({
      unlockedLevel: 2,
      starsByLevel: { 1: 3, 2: 0 },
      bestScoreByLevel: { 1: 2500 },
      soundEnabled: false,
      wallet: { coins: 999999 },
      inventory: { boosters: { bomb: 2, hammer: 4 } },
      lives: { current: 5, max: 5 },
      rewardClaims: { levelFirstClear: { 1: true } },
    });

    expect(sanitizeProgressState(null)).toEqual(createDefaultProgress());
  });
});
