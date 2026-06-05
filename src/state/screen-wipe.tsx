import { type Href, useRouter } from 'expo-router';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ScreenWipeLoader, type ScreenWipePhase } from '@/components/screen-wipe-loader';

type ScreenWipeContextValue = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  setScreenReady: () => void;
  isTransitioning: boolean;
};

const READY_FALLBACK_MS = 1800;

const ScreenWipeContext = createContext<ScreenWipeContextValue | null>(null);

export function ScreenWipeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<ScreenWipePhase>('hidden');
  const pendingActionRef = useRef<(() => void) | null>(null);
  const awaitingReadyRef = useRef(false);
  const readyFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReadyFallback = useCallback(() => {
    if (readyFallbackRef.current) {
      clearTimeout(readyFallbackRef.current);
      readyFallbackRef.current = null;
    }
  }, []);

  const startReadyFallback = useCallback(() => {
    clearReadyFallback();
    readyFallbackRef.current = setTimeout(() => {
      awaitingReadyRef.current = false;
      setPhase('opening');
    }, READY_FALLBACK_MS);
  }, [clearReadyFallback]);

  const setScreenReady = useCallback(() => {
    if (!awaitingReadyRef.current) {
      return;
    }

    awaitingReadyRef.current = false;
    clearReadyFallback();
    setPhase((current) => (current === 'closed' ? 'opening' : current));
  }, [clearReadyFallback]);

  const beginNavigation = useCallback(
    (action: () => void) => {
      if (phase !== 'hidden') {
        return;
      }

      pendingActionRef.current = action;
      awaitingReadyRef.current = true;
      clearReadyFallback();
      setPhase('closing');
    },
    [clearReadyFallback, phase],
  );

  const push = useCallback((href: Href) => beginNavigation(() => router.push(href)), [beginNavigation, router]);
  const replace = useCallback((href: Href) => beginNavigation(() => router.replace(href)), [beginNavigation, router]);

  const handleClosed = useCallback(() => {
    setPhase('closed');
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    startReadyFallback();
    if (action) {
      startTransition(() => {
        action();
      });
    }
  }, [startReadyFallback]);

  const handleOpened = useCallback(() => {
    setPhase('hidden');
  }, []);

  useEffect(() => () => clearReadyFallback(), [clearReadyFallback]);

  const value = useMemo<ScreenWipeContextValue>(
    () => ({
      push,
      replace,
      setScreenReady,
      isTransitioning: phase !== 'hidden',
    }),
    [phase, push, replace, setScreenReady],
  );

  return (
    <ScreenWipeContext.Provider value={value}>
      {children}
      <ScreenWipeLoader phase={phase} onClosed={handleClosed} onOpened={handleOpened} />
    </ScreenWipeContext.Provider>
  );
}

export function useScreenWipe() {
  const context = useContext(ScreenWipeContext);
  if (!context) {
    throw new Error('useScreenWipe must be used within ScreenWipeProvider');
  }

  return context;
}
