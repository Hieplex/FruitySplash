import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  applyLevelCompletion,
  consumeBooster,
  createDefaultProgress,
  sanitizeProgressState,
  type BoosterId,
  type ProgressState,
} from '@/state/progress-helpers';

type ProgressContextValue = ProgressState & {
  hydrated: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  completeLevel: (levelId: number, score: number, stars: number) => void;
  consumeBooster: (boosterId: BoosterId) => boolean;
};

const STORAGE_KEY = 'fruity-splash-progress-v1';

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: PropsWithChildren) {
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

  const value = useMemo<ProgressContextValue>(
    () => ({
      ...state,
      hydrated,
      setSoundEnabled: (enabled) => setState((current) => ({ ...current, soundEnabled: enabled })),
      completeLevel: (levelId, score, stars) =>
        setState((current) => applyLevelCompletion(current, levelId, score, stars)),
      consumeBooster: (boosterId) => {
        let consumed = false;
        setState((current) => {
          const result = consumeBooster(current, boosterId);
          consumed = result.consumed;
          return result.state;
        });
        return consumed;
      },
    }),
    [hydrated, state],
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

export { createDefaultProgress, applyLevelCompletion, consumeBooster, sanitizeProgressState } from '@/state/progress-helpers';
export {
  getCompletedLevelCountInRange,
  getLevelStars,
  getPlayableLevelId,
  hasCompletedLevel,
  hasCompletedLevelRange,
  isLevelUnlocked,
} from '@/state/progress-helpers';
