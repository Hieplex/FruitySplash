import {
  consumeBooster as consumeProgressBooster,
  createDefaultProgress,
  MAX_WALLET_COINS,
  sanitizeProgressState,
  type BoosterId,
  type ProgressState,
} from '@/state/progress-helpers';

export type PlayerState = ProgressState;

export function createDefaultPlayerState(): PlayerState {
  return createDefaultProgress();
}

export function sanitizePlayerState(value: unknown): PlayerState {
  return sanitizeProgressState(value);
}

function sanitizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function sanitizeCoinCount(value: number) {
  return Math.min(MAX_WALLET_COINS, sanitizeCount(value));
}

export function addCoins(player: PlayerState, amount: number): PlayerState {
  return {
    ...player,
    wallet: {
      ...player.wallet,
      coins: sanitizeCoinCount(player.wallet.coins + sanitizeCount(amount)),
    },
  };
}

export function spendCoins(player: PlayerState, amount: number): { spent: boolean; state: PlayerState } {
  const cost = sanitizeCount(amount);
  if (cost <= 0 || player.wallet.coins < cost) {
    return { spent: false, state: player };
  }

  return {
    spent: true,
    state: {
      ...player,
      wallet: {
        ...player.wallet,
        coins: player.wallet.coins - cost,
      },
    },
  };
}

export function addLives(player: PlayerState, amount: number): PlayerState {
  return {
    ...player,
    lives: {
      ...player.lives,
      current: Math.min(player.lives.max, player.lives.current + sanitizeCount(amount)),
    },
  };
}

export function consumeLife(player: PlayerState): { consumed: boolean; state: PlayerState } {
  if (player.lives.current <= 0) {
    return { consumed: false, state: player };
  }

  return {
    consumed: true,
    state: {
      ...player,
      lives: {
        ...player.lives,
        current: player.lives.current - 1,
      },
    },
  };
}

export function addBoosters(player: PlayerState, boosterId: BoosterId, amount: number): PlayerState {
  const currentCount = player.inventory.boosters[boosterId] ?? 0;

  return {
    ...player,
    inventory: {
      ...player.inventory,
      boosters: {
        ...player.inventory.boosters,
        [boosterId]: currentCount + sanitizeCount(amount),
      },
    },
  };
}

export function consumeBooster(player: PlayerState, boosterId: BoosterId): { consumed: boolean; state: PlayerState } {
  return consumeProgressBooster(player, boosterId);
}
