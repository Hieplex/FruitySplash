import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  applyLevelCompletion,
  applyEnergyRefill,
  buyBoosterPack,
  calculateLevelCoinReward,
  consumeBooster,
  consumeLevelEnergy,
  createDefaultProgress,
  grantCoinPack,
  sanitizeProgressState,
  type BoosterId,
  type ProgressState,
} from '@/state/progress-helpers';
import {
  applyCloudEconomyToProgress,
  buyBoosterPackCloud,
  claimLevelCompletionCloud,
  cloudEconomyConfigured,
  consumeBoosterCloud,
  grantPurchasedCoinPackCloud,
  loadCloudEconomy,
  spendLevelEnergyCloud,
  signOutCloudEconomy,
} from '@/state/cloud-economy';
import { useGoogleAuth } from '@/state/google-auth';

type ProgressContextValue = ProgressState & {
  hydrated: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolumePercent: (percent: number) => void;
  setVfxEnabled: (enabled: boolean) => void;
  setVfxVolumePercent: (percent: number) => void;
  setShakingEnabled: (enabled: boolean) => void;
  completeLevel: (levelId: number, score: number, stars: number) => Promise<void>;
  spendLevelEnergy: () => Promise<boolean>;
  consumeBooster: (boosterId: BoosterId) => Promise<boolean>;
  buyBoosterPack: (boosterId: BoosterId, coinCost: number, boosterAmount: number) => Promise<boolean>;
  buyCoinPack: (productId: string, coinAmount: number, transactionId: string) => Promise<boolean>;
};

const STORAGE_KEY = 'fruity-splash-progress-v1';

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: PropsWithChildren) {
  const googleAuth = useGoogleAuth();
  const [state, setState] = useState<ProgressState>(createDefaultProgress);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        setState(sanitizeProgressState(JSON.parse(value)));
      })
      .catch(() => {
        setState(createDefaultProgress());
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;

    const timer = setInterval(() => {
      setState((current) => applyEnergyRefill(current));
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !googleAuth.initialized || !cloudEconomyConfigured) {
      return;
    }

    if (!googleAuth.user) {
      void signOutCloudEconomy();
      return;
    }

    let cancelled = false;

    void loadCloudEconomy().then((economy) => {
      if (!economy || cancelled) {
        return;
      }

      setState((current) => applyCloudEconomyToProgress(current, economy));
    });

    return () => {
      cancelled = true;
    };
  }, [googleAuth.initialized, googleAuth.user, hydrated]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ...state,
      hydrated,
      setSoundEnabled: (enabled) => setState((current) => ({ ...current, soundEnabled: enabled })),
      setSoundVolumePercent: (percent) =>
        setState((current) => ({
          ...current,
          soundEnabled: true,
          soundVolumePercent: Math.max(1, Math.min(100, Math.round(percent))),
        })),
      setVfxEnabled: (enabled) => setState((current) => ({ ...current, vfxEnabled: enabled })),
      setVfxVolumePercent: (percent) =>
        setState((current) => ({
          ...current,
          vfxEnabled: true,
          vfxVolumePercent: Math.max(1, Math.min(100, Math.round(percent))),
        })),
      setShakingEnabled: (enabled) => setState((current) => ({ ...current, shakingEnabled: enabled })),
      completeLevel: async (levelId, score, stars) => {
        let nextState: ProgressState | null = null;

        setState((current) => {
          const progressed = applyLevelCompletion(current, levelId, score, stars);
          nextState = cloudEconomyConfigured && googleAuth.user
            ? applyCloudEconomyToProgress(progressed, {
                coins: current.wallet.coins,
                boosters: current.inventory.boosters,
                energy: current.lives,
              })
            : progressed;
          return nextState;
        });

        if (!cloudEconomyConfigured || !googleAuth.user) {
          return;
        }

        const economy = await claimLevelCompletionCloud(levelId, score, stars);
        if (economy) {
          setState((current) => applyCloudEconomyToProgress(current, economy));
        }
      },
      spendLevelEnergy: async () => {
        if (cloudEconomyConfigured && googleAuth.user) {
          const economy = await spendLevelEnergyCloud();
          if (!economy) {
            return false;
          }

          setState((current) => applyCloudEconomyToProgress(current, economy));
          return true;
        }

        let consumed = false;
        setState((current) => {
          const result = consumeLevelEnergy(current);
          consumed = result.consumed;
          return result.state;
        });
        return consumed;
      },
      consumeBooster: async (boosterId) => {
        if (cloudEconomyConfigured && googleAuth.user) {
          const economy = await consumeBoosterCloud(boosterId);
          if (!economy) {
            return false;
          }

          setState((current) => applyCloudEconomyToProgress(current, economy));
          return true;
        }

        let consumed = false;
        setState((current) => {
          const result = consumeBooster(current, boosterId);
          consumed = result.consumed;
          return result.state;
        });
        return consumed;
      },
      buyBoosterPack: async (boosterId, coinCost, boosterAmount) => {
        if (cloudEconomyConfigured && googleAuth.user) {
          const economy = await buyBoosterPackCloud(boosterId, coinCost, boosterAmount);
          if (!economy) {
            return false;
          }

          setState((current) => applyCloudEconomyToProgress(current, economy));
          return true;
        }

        let purchased = false;
        setState((current) => {
          const result = buyBoosterPack(current, boosterId, coinCost, boosterAmount);
          purchased = result.purchased;
          return result.state;
        });
        return purchased;
      },
      buyCoinPack: async (productId, coinAmount, transactionId) => {
        if (cloudEconomyConfigured && googleAuth.user) {
          const economy = await grantPurchasedCoinPackCloud(productId, transactionId, coinAmount);
          if (!economy) {
            return false;
          }

          setState((current) => applyCloudEconomyToProgress(current, economy));
          return true;
        }

        setState((current) => grantCoinPack(current, coinAmount));
        return coinAmount > 0;
      },
    }),
    [googleAuth.user, hydrated, state],
  );

  return createElement(ProgressContext.Provider, { value }, children);
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error('useProgress must be used inside ProgressProvider');
  }
  return value;
}

export {
  buyBoosterPack,
  calculateLevelCoinReward,
  createDefaultProgress,
  applyLevelCompletion,
  consumeBooster,
  consumeLevelEnergy,
  grantCoinPack,
  sanitizeProgressState,
} from '@/state/progress-helpers';
export {
  getCompletedLevelCountInRange,
  getLevelStars,
  getPlayableLevelId,
  hasCompletedLevel,
  hasCompletedLevelRange,
  isLevelUnlocked,
} from '@/state/progress-helpers';
