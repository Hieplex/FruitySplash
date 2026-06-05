import { Stack } from 'expo-router';
import { StatusBar, setStatusBarHidden } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { warmStartupAssets } from '@/game/assets/preload-assets.native';
import { ProgressProvider } from '@/state/progress-store';
import { ScreenWipeProvider } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';

type NavigationBarModule = typeof import('expo-navigation-bar');

function getNavigationBar(): NavigationBarModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    return require('expo-navigation-bar') as NavigationBarModule;
  } catch {
    return null;
  }
}

function hideSystemBars() {
  setStatusBarHidden(true, 'none');

  getNavigationBar()?.NavigationBar.setHidden(true);
}

export default function RootLayout() {
  useEffect(() => {
    hideSystemBars();
    void warmStartupAssets();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        hideSystemBars();
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ProgressProvider>
      <ScreenWipeProvider>
        <StatusBar hidden />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.cream },
          }}
        />
      </ScreenWipeProvider>
    </ProgressProvider>
  );
}
