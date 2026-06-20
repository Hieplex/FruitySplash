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
const OPEN_FALLBACK_MS = 900;

const ScreenWipeContext = createContext<ScreenWipeContextValue | null>(null);

export function ScreenWipeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<ScreenWipePhase>('hidden');
  const phaseRef = useRef<ScreenWipePhase>('hidden');
  const pendingActionRef = useRef<(() => void) | null>(null);
  const awaitingReadyRef = useRef(false);
  const readyRequestedRef = useRef(false);
  const routeActionStartedRef = useRef(false);
  const readyFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWipePhase = useCallback((nextPhase: ScreenWipePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const clearReadyFallback = useCallback(() => {
    if (readyFallbackRef.current) {
      clearTimeout(readyFallbackRef.current);
      readyFallbackRef.current = null;
    }
  }, []);

  const clearOpenFallback = useCallback(() => {
    if (openFallbackRef.current) {
      clearTimeout(openFallbackRef.current);
      openFallbackRef.current = null;
    }
  }, []);

  const startOpening = useCallback(() => {
    clearOpenFallback();
    setWipePhase('opening');
    openFallbackRef.current = setTimeout(() => {
      setWipePhase('hidden');
    }, OPEN_FALLBACK_MS);
  }, [clearOpenFallback, setWipePhase]);

  const startReadyFallback = useCallback(() => {
    clearReadyFallback();
    clearOpenFallback();
    readyFallbackRef.current = setTimeout(() => {
      awaitingReadyRef.current = false;
      readyRequestedRef.current = false;
      routeActionStartedRef.current = false;
      startOpening();
    }, READY_FALLBACK_MS);
  }, [clearOpenFallback, clearReadyFallback, startOpening]);

  const setScreenReady = useCallback(() => {
    if (!awaitingReadyRef.current || !routeActionStartedRef.current) {
      return;
    }

    if (phaseRef.current === 'closed') {
      awaitingReadyRef.current = false;
      readyRequestedRef.current = false;
      clearReadyFallback();
      startOpening();
      return;
    }

    readyRequestedRef.current = true;
  }, [clearReadyFallback, startOpening]);

  const beginNavigation = useCallback(
    (action: () => void) => {
      const currentPhase = phaseRef.current;

      if (currentPhase === 'opening') {
        return;
      }

      pendingActionRef.current = action;
      awaitingReadyRef.current = true;
      readyRequestedRef.current = false;
      routeActionStartedRef.current = false;
      clearOpenFallback();

      if (currentPhase === 'closing') {
        return;
      }

      clearReadyFallback();

      if (currentPhase === 'closed') {
        startReadyFallback();
        const pendingAction = pendingActionRef.current;
        pendingActionRef.current = null;

        if (pendingAction) {
          routeActionStartedRef.current = true;
          startTransition(() => {
            pendingAction();
          });
        }
        return;
      }

      setWipePhase('closing');
    },
    [clearOpenFallback, clearReadyFallback, setWipePhase, startReadyFallback],
  );

  const push = useCallback((href: Href) => beginNavigation(() => router.push(href)), [beginNavigation, router]);
  const replace = useCallback((href: Href) => beginNavigation(() => router.replace(href)), [beginNavigation, router]);

  const handleClosed = useCallback(() => {
    setWipePhase('closed');
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    readyRequestedRef.current = false;
    startReadyFallback();

    if (action) {
      routeActionStartedRef.current = true;
      startTransition(() => {
        action();
      });
    }
  }, [setWipePhase, startReadyFallback]);

  const handleOpened = useCallback(() => {
    clearOpenFallback();
    routeActionStartedRef.current = false;
    setWipePhase('hidden');
  }, [clearOpenFallback, setWipePhase]);

  useEffect(() => () => {
    clearReadyFallback();
    clearOpenFallback();
  }, [clearOpenFallback, clearReadyFallback]);

  const value = useMemo<ScreenWipeContextValue>(
    () => ({
      push,
      replace,
      setScreenReady,
      isTransitioning: phaseRef.current !== 'hidden',
    }),
    [push, replace, setScreenReady],
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
