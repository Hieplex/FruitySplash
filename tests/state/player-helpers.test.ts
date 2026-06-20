import { describe, expect, it } from 'vitest';
import {
  addBoosters,
  addCoins,
  addLives,
  consumeBooster,
  consumeLife,
  createDefaultPlayerState,
  sanitizePlayerState,
  spendCoins,
} from '@/state/player-helpers';

describe('player economy helpers', () => {
  it('starts with an empty wallet, full lives, and booster inventory slots', () => {
    expect(createDefaultPlayerState()).toMatchObject({
      wallet: { coins: 0 },
      lives: {
        current: 30,
        max: 30,
      },
      inventory: {
        boosters: {
          bomb: 3,
          lineRocket: 3,
          fruityCross: 3,
          lightningFruits: 3,
          hammer: 0,
        },
      },
    });
  });

  it('adds and spends coins without allowing negative balances', () => {
    const player = addCoins(createDefaultPlayerState(), 125);

    expect(spendCoins(player, 75)).toMatchObject({
      spent: true,
      state: {
        wallet: { coins: 50 },
      },
    });

    expect(spendCoins(player, 200)).toMatchObject({
      spent: false,
      state: player,
    });
  });

  it('caps added coins at the wallet maximum', () => {
    const player = {
      ...createDefaultPlayerState(),
      wallet: { coins: 999990 },
    };

    expect(addCoins(player, 25).wallet.coins).toBe(999999);
  });

  it('caps lives at max and reports failed life consumption', () => {
    const emptyLives = {
      ...createDefaultPlayerState(),
      lives: {
        current: 0,
        max: 30,
        lastRefillAt: 1_000,
      },
    };

    expect(addLives(emptyLives, 40).lives.current).toBe(30);
    expect(consumeLife(emptyLives)).toMatchObject({ consumed: false, state: emptyLives });
    expect(consumeLife(addLives(emptyLives, 1))).toMatchObject({
      consumed: true,
      state: {
        lives: {
          current: 0,
          max: 30,
        },
      },
    });
  });

  it('adds and consumes boosters by inventory key', () => {
    const player = addBoosters(createDefaultPlayerState(), 'bomb', 2);

    expect(consumeBooster(player, 'bomb')).toMatchObject({
      consumed: true,
      state: {
        inventory: {
          boosters: {
            bomb: 4,
            lineRocket: 3,
            fruityCross: 3,
            lightningFruits: 3,
            hammer: 0,
          },
        },
      },
    });

    expect(
      consumeBooster(
        {
          ...createDefaultPlayerState(),
          inventory: {
            boosters: {
              bomb: 0,
              lineRocket: 3,
              fruityCross: 3,
              lightningFruits: 3,
              hammer: 0,
            },
          },
        },
        'bomb',
      ),
    ).toMatchObject({
      consumed: false,
    });
  });

  it('sanitizes legacy progress into a player state with economy defaults', () => {
    expect(
      sanitizePlayerState({
        unlockedLevel: 3.8,
        starsByLevel: { 1: 3 },
        bestScoreByLevel: { 1: 1800 },
        soundEnabled: false,
      }),
    ).toMatchObject({
      unlockedLevel: 3,
      starsByLevel: { 1: 3 },
      bestScoreByLevel: { 1: 1800 },
      soundEnabled: false,
      wallet: {
        coins: 0,
      },
      inventory: {
        boosters: {
          bomb: 3,
          lineRocket: 3,
          fruityCross: 3,
          lightningFruits: 3,
          hammer: 0,
        },
      },
      lives: {
        current: 30,
        max: 30,
      },
      rewardClaims: {
        levelFirstClear: {},
        levelStarReward: {},
      },
    });
  });

  it('sanitizes malformed economy values before persistence reuse', () => {
    expect(
      sanitizePlayerState({
        wallet: {
          coins: 12.9,
        },
        lives: {
          current: 20,
          max: 4,
        },
        inventory: {
          boosters: {
            bomb: -2,
            unknown: 9,
          },
        },
      }),
    ).toMatchObject({
      wallet: {
        coins: 12,
      },
      lives: {
        current: 30,
        max: 30,
      },
      inventory: {
        boosters: {
          bomb: 0,
          lineRocket: 3,
          fruityCross: 3,
          lightningFruits: 3,
          hammer: 0,
        },
      },
    });
  });
});
