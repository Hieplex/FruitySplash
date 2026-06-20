export type BoosterId = 'bomb' | 'lineRocket' | 'fruityCross' | 'lightningFruits' | 'hammer';
export type BoosterInventoryState = Record<BoosterId, number>;

export type ProgressState = {
  unlockedLevel: number;
  starsByLevel: Record<number, number>;
  bestScoreByLevel: Record<number, number>;
  soundEnabled: boolean;
  soundVolumePercent: number;
  vfxEnabled: boolean;
  vfxVolumePercent: number;
  shakingEnabled: boolean;
  wallet: {
    coins: number;
  };
  inventory: {
    boosters: Record<BoosterId, number>;
  };
  lives: {
    current: number;
    max: number;
    lastRefillAt: number;
  };
  rewardClaims: {
    levelFirstClear: Record<number, true>;
    levelStarReward: Record<number, number>;
  };
};

export const FIRST_CLEAR_COIN_REWARD_BASE = 40;
export const FIRST_CLEAR_COIN_REWARD_PER_LEVEL = 2;
export const FIRST_CLEAR_COIN_REWARD = FIRST_CLEAR_COIN_REWARD_BASE;
export const STAR_COIN_REWARD_BY_TIER = [10, 15, 25] as const;
export const STAR_COIN_REWARD_PER_LEVEL_BY_TIER = [1, 2, 3] as const;
export const STAR_COIN_REWARD = STAR_COIN_REWARD_BY_TIER[0];
export const MAX_WALLET_COINS = 999999;
export const MAX_ENERGY = 30;
export const ENERGY_REFILL_INTERVAL_MS = 10 * 60 * 1000;

export function createDefaultBoosterInventory(): BoosterInventoryState {
  return {
    bomb: 3,
    lineRocket: 3,
    fruityCross: 3,
    lightningFruits: 3,
    hammer: 0,
  };
}

export function createDefaultProgress(): ProgressState {
  const now = Date.now();

  return {
    unlockedLevel: 1,
    starsByLevel: {},
    bestScoreByLevel: {},
    soundEnabled: true,
    soundVolumePercent: 100,
    vfxEnabled: true,
    vfxVolumePercent: 100,
    shakingEnabled: true,
    wallet: { coins: 0 },
    inventory: { boosters: createDefaultBoosterInventory() },
    lives: { current: MAX_ENERGY, max: MAX_ENERGY, lastRefillAt: now },
    rewardClaims: { levelFirstClear: {}, levelStarReward: {} },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeNumberRecord(value: unknown): Record<number, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [Number(key), entry] as const)
      .filter(([key, entry]) => Number.isInteger(key) && typeof entry === 'number' && Number.isFinite(entry))
      .map(([key, entry]) => [key, Math.max(0, Math.floor(entry as number))]),
  );
}

function sanitizeBooleanClaimRecord(value: unknown): Record<number, true> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [Number(key), entry] as const)
      .filter(([key, entry]) => Number.isInteger(key) && entry === true)
      .map(([key]) => [key, true]),
  );
}

function sanitizeCount(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function sanitizeCoinCount(value: unknown, fallback = 0) {
  return Math.min(MAX_WALLET_COINS, sanitizeCount(value, fallback));
}

function sanitizeTimestamp(value: unknown, fallback = Date.now()) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function sanitizePercent(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(100, Math.round(value)))
    : fallback;
}

export function sanitizeProgressState(value: unknown): ProgressState {
  const defaults = createDefaultProgress();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    unlockedLevel:
      typeof value.unlockedLevel === 'number' && Number.isFinite(value.unlockedLevel)
        ? Math.max(1, Math.floor(value.unlockedLevel))
        : defaults.unlockedLevel,
    starsByLevel: sanitizeNumberRecord(value.starsByLevel),
    bestScoreByLevel: sanitizeNumberRecord(value.bestScoreByLevel),
    soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : defaults.soundEnabled,
    soundVolumePercent: sanitizePercent(value.soundVolumePercent, defaults.soundVolumePercent),
    vfxEnabled: typeof value.vfxEnabled === 'boolean' ? value.vfxEnabled : defaults.vfxEnabled,
    vfxVolumePercent: sanitizePercent(value.vfxVolumePercent, defaults.vfxVolumePercent),
    shakingEnabled: typeof value.shakingEnabled === 'boolean' ? value.shakingEnabled : defaults.shakingEnabled,
    wallet: {
      coins:
        isRecord(value.wallet) && typeof value.wallet.coins === 'number' && Number.isFinite(value.wallet.coins)
          ? sanitizeCoinCount(value.wallet.coins)
          : defaults.wallet.coins,
    },
    inventory: {
      boosters: {
        bomb:
          isRecord(value.inventory) &&
          isRecord(value.inventory.boosters) &&
          typeof value.inventory.boosters.bomb === 'number' &&
          Number.isFinite(value.inventory.boosters.bomb)
            ? Math.max(0, Math.floor(value.inventory.boosters.bomb))
            : defaults.inventory.boosters.bomb,
        lineRocket:
          isRecord(value.inventory) &&
          isRecord(value.inventory.boosters) &&
          typeof value.inventory.boosters.lineRocket === 'number' &&
          Number.isFinite(value.inventory.boosters.lineRocket)
            ? Math.max(0, Math.floor(value.inventory.boosters.lineRocket))
            : defaults.inventory.boosters.lineRocket,
        fruityCross:
          isRecord(value.inventory) &&
          isRecord(value.inventory.boosters) &&
          typeof value.inventory.boosters.fruityCross === 'number' &&
          Number.isFinite(value.inventory.boosters.fruityCross)
            ? Math.max(0, Math.floor(value.inventory.boosters.fruityCross))
            : defaults.inventory.boosters.fruityCross,
        lightningFruits:
          isRecord(value.inventory) &&
          isRecord(value.inventory.boosters) &&
          typeof value.inventory.boosters.lightningFruits === 'number' &&
          Number.isFinite(value.inventory.boosters.lightningFruits)
            ? Math.max(0, Math.floor(value.inventory.boosters.lightningFruits))
            : defaults.inventory.boosters.lightningFruits,
        hammer:
          isRecord(value.inventory) &&
          isRecord(value.inventory.boosters) &&
          typeof value.inventory.boosters.hammer === 'number' &&
          Number.isFinite(value.inventory.boosters.hammer)
            ? Math.max(0, Math.floor(value.inventory.boosters.hammer))
            : defaults.inventory.boosters.hammer,
      },
    },
    lives: (() => {
      const persistedMax =
        isRecord(value.lives) && typeof value.lives.max === 'number' && Number.isFinite(value.lives.max)
          ? Math.max(1, Math.floor(value.lives.max))
          : defaults.lives.max;
      const rawCurrent =
        isRecord(value.lives) && typeof value.lives.current === 'number' && Number.isFinite(value.lives.current)
          ? sanitizeCount(value.lives.current)
          : defaults.lives.current;
      const max = MAX_ENERGY;
      const current = persistedMax < MAX_ENERGY && rawCurrent >= persistedMax ? MAX_ENERGY : rawCurrent;
      const lastRefillAt = isRecord(value.lives)
        ? sanitizeTimestamp(value.lives.lastRefillAt, defaults.lives.lastRefillAt)
        : defaults.lives.lastRefillAt;

      return applyEnergyRefill({
        ...defaults,
        lives: {
          current: Math.min(current, max),
          max,
          lastRefillAt,
        },
      }).lives;
    })(),
    rewardClaims: {
      levelFirstClear:
        isRecord(value.rewardClaims) ? sanitizeBooleanClaimRecord(value.rewardClaims.levelFirstClear) : {},
      levelStarReward:
        isRecord(value.rewardClaims) ? sanitizeNumberRecord(value.rewardClaims.levelStarReward) : {},
    },
  };
}

export function getLevelStars(progress: ProgressState, levelId: number) {
  return progress.starsByLevel[levelId] ?? 0;
}

export function applyEnergyRefill(progress: ProgressState, now = Date.now()): ProgressState {
  if (progress.lives.current >= progress.lives.max) {
    return {
      ...progress,
      lives: {
        ...progress.lives,
        current: progress.lives.max,
        lastRefillAt: now,
      },
    };
  }

  const elapsedMs = Math.max(0, now - progress.lives.lastRefillAt);
  const refillCount = Math.floor(elapsedMs / ENERGY_REFILL_INTERVAL_MS);

  if (refillCount <= 0) {
    return progress;
  }

  const nextCurrent = Math.min(progress.lives.max, progress.lives.current + refillCount);
  const nextRefillAt =
    nextCurrent >= progress.lives.max ? now : progress.lives.lastRefillAt + refillCount * ENERGY_REFILL_INTERVAL_MS;

  return {
    ...progress,
    lives: {
      ...progress.lives,
      current: nextCurrent,
      lastRefillAt: nextRefillAt,
    },
  };
}

export function consumeLevelEnergy(progress: ProgressState, now = Date.now()): { consumed: boolean; state: ProgressState } {
  const refilled = applyEnergyRefill(progress, now);
  if (refilled.lives.current <= 0) {
    return { consumed: false, state: refilled };
  }

  const nextCurrent = refilled.lives.current - 1;

  return {
    consumed: true,
    state: {
      ...refilled,
      lives: {
        ...refilled.lives,
        current: nextCurrent,
        lastRefillAt: nextCurrent >= refilled.lives.max ? now : refilled.lives.lastRefillAt,
      },
    },
  };
}

export function hasCompletedLevel(progress: ProgressState, levelId: number) {
  return progress.rewardClaims.levelFirstClear[levelId] === true || getLevelStars(progress, levelId) > 0;
}

export function getCompletedLevelCountInRange(progress: ProgressState, startLevel: number, endLevel: number) {
  const safeStartLevel = Math.max(1, Math.floor(startLevel));
  const safeEndLevel = Math.max(safeStartLevel, Math.floor(endLevel));
  let completedCount = 0;

  for (let levelId = safeStartLevel; levelId <= safeEndLevel; levelId += 1) {
    if (hasCompletedLevel(progress, levelId)) {
      completedCount += 1;
    }
  }

  return completedCount;
}

export function hasCompletedLevelRange(progress: ProgressState, startLevel: number, endLevel: number) {
  const safeStartLevel = Math.max(1, Math.floor(startLevel));
  const safeEndLevel = Math.max(safeStartLevel, Math.floor(endLevel));

  return getCompletedLevelCountInRange(progress, safeStartLevel, safeEndLevel) === safeEndLevel - safeStartLevel + 1;
}

export function getCompletedLevelCountFromStart(progress: ProgressState) {
  let completedCount = 0;

  for (let levelId = 1; ; levelId += 1) {
    if (!hasCompletedLevel(progress, levelId)) {
      break;
    }

    completedCount += 1;
  }

  return completedCount;
}

export function getLastCompletedLevelIdFromStart(progress: ProgressState) {
  return Math.max(1, getCompletedLevelCountFromStart(progress));
}

export function isLevelUnlocked(progress: ProgressState, levelId: number) {
  return levelId <= progress.unlockedLevel;
}

export function getPlayableLevelId(progress: ProgressState, requestedLevelId: number, levelIds: readonly number[]) {
  const availableLevelIds = [...levelIds].sort((left, right) => left - right);
  const fallbackLevelId =
    [...availableLevelIds].reverse().find((levelId) => isLevelUnlocked(progress, levelId)) ?? availableLevelIds[0] ?? 1;

  if (!availableLevelIds.includes(requestedLevelId)) {
    return fallbackLevelId;
  }

  return isLevelUnlocked(progress, requestedLevelId) ? requestedLevelId : fallbackLevelId;
}

export function getLevelFirstClearCoinReward(levelId: number) {
  const safeLevelId = Math.max(1, Math.floor(levelId));
  return FIRST_CLEAR_COIN_REWARD_BASE + (safeLevelId - 1) * FIRST_CLEAR_COIN_REWARD_PER_LEVEL;
}

export function getLevelStarCoinReward(levelId: number, starTier: number) {
  const safeLevelId = Math.max(1, Math.floor(levelId));
  const tierIndex = Math.max(0, Math.min(2, Math.floor(starTier) - 1));
  return STAR_COIN_REWARD_BY_TIER[tierIndex] + (safeLevelId - 1) * STAR_COIN_REWARD_PER_LEVEL_BY_TIER[tierIndex];
}

export function calculateLevelCoinReward(progress: ProgressState, levelId: number, stars: number) {
  const safeLevelId = Math.max(1, Math.floor(levelId));
  const safeStars = Math.max(0, Math.min(3, Math.floor(stars)));
  const alreadyClaimedFirstClear = progress.rewardClaims.levelFirstClear[safeLevelId] === true;
  const rewardedStars = Math.max(0, Math.min(3, Math.floor(progress.rewardClaims.levelStarReward[safeLevelId] ?? 0)));
  let newStarReward = 0;

  for (let starTier = rewardedStars + 1; starTier <= safeStars; starTier += 1) {
    newStarReward += getLevelStarCoinReward(safeLevelId, starTier);
  }

  return (alreadyClaimedFirstClear ? 0 : getLevelFirstClearCoinReward(safeLevelId)) + newStarReward;
}

export function applyLevelCompletion(progress: ProgressState, levelId: number, score: number, stars: number): ProgressState {
  const currentBestStars = progress.starsByLevel[levelId] ?? 0;
  const currentBestScore = progress.bestScoreByLevel[levelId] ?? 0;
  const safeStars = Math.max(0, Math.min(3, Math.floor(stars)));
  const coinReward = calculateLevelCoinReward(progress, levelId, safeStars);

  return {
    ...progress,
    unlockedLevel: Math.max(progress.unlockedLevel, levelId + 1),
    starsByLevel: {
      ...progress.starsByLevel,
      [levelId]: Math.max(currentBestStars, safeStars),
    },
    bestScoreByLevel: {
      ...progress.bestScoreByLevel,
      [levelId]: Math.max(currentBestScore, score),
    },
    wallet: {
      ...progress.wallet,
      coins: sanitizeCoinCount(progress.wallet.coins + coinReward),
    },
    rewardClaims: {
      ...progress.rewardClaims,
      levelFirstClear: {
        ...progress.rewardClaims.levelFirstClear,
        [levelId]: true,
      },
      levelStarReward: {
        ...progress.rewardClaims.levelStarReward,
        [levelId]: Math.max(progress.rewardClaims.levelStarReward[levelId] ?? 0, safeStars),
      },
    },
  };
}

export function consumeBooster(progress: ProgressState, boosterId: BoosterId): { consumed: boolean; state: ProgressState } {
  const currentCount = progress.inventory.boosters[boosterId] ?? 0;
  if (currentCount <= 0) {
    return { consumed: false, state: progress };
  }

  return {
    consumed: true,
    state: {
      ...progress,
      inventory: {
        ...progress.inventory,
        boosters: {
          ...progress.inventory.boosters,
          [boosterId]: currentCount - 1,
        },
      },
    },
  };
}

export function buyBoosterPack(
  progress: ProgressState,
  boosterId: BoosterId,
  coinCost: number,
  boosterAmount: number,
): { purchased: boolean; state: ProgressState } {
  const safeCoinCost = sanitizeCoinCount(coinCost);
  const safeBoosterAmount = sanitizeCount(boosterAmount);

  if (safeCoinCost <= 0 || safeBoosterAmount <= 0 || progress.wallet.coins < safeCoinCost) {
    return { purchased: false, state: progress };
  }

  return {
    purchased: true,
    state: {
      ...progress,
      wallet: {
        ...progress.wallet,
        coins: progress.wallet.coins - safeCoinCost,
      },
      inventory: {
        ...progress.inventory,
        boosters: {
          ...progress.inventory.boosters,
          [boosterId]: (progress.inventory.boosters[boosterId] ?? 0) + safeBoosterAmount,
        },
      },
    },
  };
}

export function grantCoinPack(progress: ProgressState, coinAmount: number): ProgressState {
  const safeCoinAmount = sanitizeCount(coinAmount);
  if (safeCoinAmount <= 0) {
    return progress;
  }

  return {
    ...progress,
    wallet: {
      ...progress.wallet,
      coins: sanitizeCoinCount(progress.wallet.coins + safeCoinAmount),
    },
  };
}
