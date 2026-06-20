import { createContext, createElement, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
type GoogleUser = import('@react-native-google-signin/google-signin').User['user'];

type GoogleAuthContextValue = {
  configured: boolean;
  initialized: boolean;
  loading: boolean;
  user: GoogleUser | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function loadGoogleSignin(): GoogleSigninModule | null {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

function getAuthErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Google sign-in is not available.';
}

export function GoogleAuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleSignin = loadGoogleSignin();
  const configured = Boolean(googleSignin && GOOGLE_WEB_CLIENT_ID);

  useEffect(() => {
    if (!googleSignin || !GOOGLE_WEB_CLIENT_ID) {
      setInitialized(true);
      return;
    }

    googleSignin.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });

    setLoading(true);
    googleSignin.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false })
      .then(() => googleSignin.GoogleSignin.signInSilently())
      .then((response) => {
        if (response.type === 'success') {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        setInitialized(true);
      });
  }, [googleSignin]);

  const value = useMemo<GoogleAuthContextValue>(
    () => ({
      configured,
      initialized,
      loading,
      user,
      error,
      signIn: async () => {
        if (!googleSignin || !GOOGLE_WEB_CLIENT_ID) {
          setError('Google sign-in needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and a native Android build.');
          return;
        }

        setLoading(true);
        setError(null);

        try {
          await googleSignin.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const response = await googleSignin.GoogleSignin.signIn();

          if (response.type === 'success') {
            setUser(response.data.user);
          }
        } catch (signInError) {
          setError(getAuthErrorMessage(signInError));
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        if (!googleSignin) {
          setUser(null);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          await googleSignin.GoogleSignin.signOut();
          setUser(null);
        } catch (signOutError) {
          setError(getAuthErrorMessage(signOutError));
        } finally {
          setLoading(false);
        }
      },
    }),
    [configured, error, googleSignin, initialized, loading, user],
  );

  return createElement(GoogleAuthContext.Provider, { value }, children);
}

export function useGoogleAuth() {
  const value = useContext(GoogleAuthContext);
  if (!value) {
    throw new Error('useGoogleAuth must be used inside GoogleAuthProvider');
  }
  return value;
}
