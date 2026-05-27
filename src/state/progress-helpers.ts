export type BoosterId = 'bomb' | 'hammer';

export type ProgressState = {
  unlockedLevel: number;
  starsByLevel: Record<number, number>;
  bestScoreByLevel: Record<number, number>;
  soundEnabled: boolean;
  wallet: {
    coins: number;
  };
  inventory: {
    boosters: Record<BoosterId, number>;
  };
  lives: {
    current: number;
    max: number;
  };
  rewardClaims: {
    levelFirstClear: Record<number, true>;
  };
};

const FIRST_CLEAR_COIN_REWARD = 50;

export function createDefaultProgress(): ProgressState {
  return {
    unlockedLevel: 1,
    starsByLevel: {},
    bestScoreByLevel: {},
    soundEnabled: true,
    wallet: { coins: 0 },
    inventory: { boosters: { bomb: 5, hammer: 5 } },
    lives: { current: 5, max: 5 },
    rewardClaims: { levelFirstClear: {} },
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
    wallet: {
      coins:
        isRecord(value.wallet) && typeof value.wallet.coins === 'number' && Number.isFinite(value.wallet.coins)
          ? Math.max(0, Math.floor(value.wallet.coins))
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
      const max =
        isRecord(value.lives) && typeof value.lives.max === 'number' && Number.isFinite(value.lives.max)
          ? Math.max(1, Math.floor(value.lives.max))
          : defaults.lives.max;
      const current =
        isRecord(value.lives) && typeof value.lives.current === 'number' && Number.isFinite(value.lives.current)
          ? sanitizeCount(value.lives.current)
          : defaults.lives.current;

      return {
        current: Math.min(current, max),
        max,
      };
    })(),
    rewardClaims: {
      levelFirstClear:
        isRecord(value.rewardClaims) ? sanitizeBooleanClaimRecord(value.rewardClaims.levelFirstClear) : {},
    },
  };
}

export function getLevelStars(progress: ProgressState, levelId: number) {
  return progress.starsByLevel[levelId] ?? 0;
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

export function applyLevelCompletion(progress: ProgressState, levelId: number, score: number, stars: number): ProgressState {
  const currentBestStars = progress.starsByLevel[levelId] ?? 0;
  const currentBestScore = progress.bestScoreByLevel[levelId] ?? 0;
  const alreadyClaimedFirstClear = progress.rewardClaims.levelFirstClear[levelId] === true;

  return {
    ...progress,
    unlockedLevel: Math.max(progress.unlockedLevel, levelId + 1),
    starsByLevel: {
      ...progress.starsByLevel,
      [levelId]: Math.max(currentBestStars, stars),
    },
    bestScoreByLevel: {
      ...progress.bestScoreByLevel,
      [levelId]: Math.max(currentBestScore, score),
    },
    wallet: {
      ...progress.wallet,
      coins: progress.wallet.coins + (alreadyClaimedFirstClear ? 0 : FIRST_CLEAR_COIN_REWARD),
    },
    rewardClaims: {
      ...progress.rewardClaims,
      levelFirstClear: {
        ...progress.rewardClaims.levelFirstClear,
        [levelId]: true,
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
