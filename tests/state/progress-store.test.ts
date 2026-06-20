import { describe, expect, it } from 'vitest';
import {
  applyLevelCompletion,
  applyEnergyRefill,
  buyBoosterPack,
  calculateLevelCoinReward,
  consumeBooster,
  consumeLevelEnergy,
  createDefaultProgress,
  ENERGY_REFILL_INTERVAL_MS,
  grantCoinPack,
  getLevelFirstClearCoinReward,
  getLevelStarCoinReward,
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
    expect(createDefaultProgress()).toMatchObject({
      unlockedLevel: 1,
      starsByLevel: {},
      bestScoreByLevel: {},
      soundEnabled: true,
      wallet: { coins: 0 },
      inventory: {
        boosters: {
          bomb: 3,
          lineRocket: 3,
          fruityCross: 3,
          lightningFruits: 3,
          hammer: 0,
        },
      },
      lives: { current: 30, max: 30 },
      rewardClaims: { levelFirstClear: {}, levelStarReward: {} },
    });
  });

  it('unlocks the next level and grants level-scaled first-clear plus new-star coins once', () => {
    const progress = createDefaultProgress();
    const next = applyLevelCompletion(progress, 1, 2200, 2);
    const upgraded = applyLevelCompletion(next, 1, 2600, 3);
    const replayed = applyLevelCompletion(upgraded, 1, 2800, 3);

    expect(next.unlockedLevel).toBe(2);
    expect(calculateLevelCoinReward(progress, 1, 2)).toBe(65);
    expect(next.wallet.coins).toBe(65);
    expect(calculateLevelCoinReward(next, 1, 3)).toBe(25);
    expect(upgraded.wallet.coins).toBe(90);
    expect(calculateLevelCoinReward(upgraded, 1, 3)).toBe(0);
    expect(replayed.wallet.coins).toBe(90);
    expect(getLevelStars(upgraded, 1)).toBe(3);
    expect(upgraded.bestScoreByLevel[1]).toBe(2600);
    expect(isLevelUnlocked(upgraded, 2)).toBe(true);
  });

  it('scales coin rewards higher for later levels and higher star tiers', () => {
    const progress = createDefaultProgress();

    expect(getLevelFirstClearCoinReward(1)).toBe(40);
    expect(getLevelFirstClearCoinReward(10)).toBe(58);
    expect(getLevelStarCoinReward(1, 1)).toBe(10);
    expect(getLevelStarCoinReward(1, 3)).toBe(25);
    expect(getLevelStarCoinReward(10, 1)).toBe(19);
    expect(getLevelStarCoinReward(10, 3)).toBe(52);
    expect(calculateLevelCoinReward(progress, 10, 3)).toBe(162);
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
      inventory: {
        boosters: {
          bomb: 1,
          lineRocket: 3,
          fruityCross: 3,
          lightningFruits: 3,
          hammer: 0,
        },
      },
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

  it('buys booster packs only when the wallet can afford them', () => {
    const progress = {
      ...createDefaultProgress(),
      wallet: { coins: 900 },
    };

    const purchase = buyBoosterPack(progress, 'lineRocket', 700, 3);
    const failed = buyBoosterPack(purchase.state, 'bomb', 500, 3);

    expect(purchase.purchased).toBe(true);
    expect(purchase.state.wallet.coins).toBe(200);
    expect(purchase.state.inventory.boosters.lineRocket).toBe(6);
    expect(failed.purchased).toBe(false);
    expect(failed.state.wallet.coins).toBe(200);
  });

  it('grants purchased coin packs without exceeding the wallet maximum', () => {
    const progress = {
      ...createDefaultProgress(),
      wallet: { coins: 995000 },
    };

    expect(grantCoinPack(progress, 10000).wallet.coins).toBe(999999);
    expect(grantCoinPack(progress, 0).wallet.coins).toBe(995000);
    expect(grantCoinPack(progress, Number.NaN).wallet.coins).toBe(995000);
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
        inventory: { boosters: { bomb: 2.9, lineRocket: 4.5, fruityCross: 1.2, lightningFruits: 0.4, hammer: 4.5 } },
      rewardClaims: { levelFirstClear: { 1: true, bad: true, 2: false }, levelStarReward: { 1: 2, bad: 9 } },
      }),
    ).toMatchObject({
      unlockedLevel: 2,
      starsByLevel: { 1: 3, 2: 0 },
      bestScoreByLevel: { 1: 2500 },
      soundEnabled: false,
      wallet: { coins: 999999 },
      inventory: {
        boosters: {
          bomb: 2,
          lineRocket: 4,
          fruityCross: 1,
          lightningFruits: 0,
          hammer: 4,
        },
      },
      lives: { current: 30, max: 30 },
      rewardClaims: { levelFirstClear: { 1: true }, levelStarReward: { 1: 2 } },
    });

    expect(sanitizeProgressState(null)).toEqual(createDefaultProgress());
  });

  it('spends one energy to start a level and refills one energy every ten minutes', () => {
    const now = 1_000_000;
    const progress = {
      ...createDefaultProgress(),
      lives: { current: 30, max: 30, lastRefillAt: now },
    };

    const spent = consumeLevelEnergy(progress, now);
    const tooSoon = applyEnergyRefill(spent.state, now + ENERGY_REFILL_INTERVAL_MS - 1);
    const refilled = applyEnergyRefill(spent.state, now + ENERGY_REFILL_INTERVAL_MS);

    expect(spent.consumed).toBe(true);
    expect(spent.state.lives.current).toBe(29);
    expect(tooSoon.lives.current).toBe(29);
    expect(refilled.lives.current).toBe(30);
  });
});
