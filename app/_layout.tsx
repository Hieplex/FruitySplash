import { Stack } from 'expo-router';
import { StatusBar, setStatusBarHidden } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, View, useWindowDimensions } from 'react-native';
import { warmGameplayAssets, warmStartupAssets, warmTreeMapAssets } from '@/game/assets/preload-assets.native';
import { getWebPlaytestFrame } from '@/platform/playtest-viewport';
import { GoogleAuthProvider } from '@/state/google-auth';
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
  const dimensions = useWindowDimensions();
  const webFrame = getWebPlaytestFrame(dimensions);
  const isWeb = Platform.OS === 'web';
  const content = (
    <GoogleAuthProvider>
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
    </GoogleAuthProvider>
  );

  useEffect(() => {
    hideSystemBars();
    void warmStartupAssets();
    void warmTreeMapAssets();
    void warmGameplayAssets();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        hideSystemBars();
      }
    });

    return () => subscription.remove();
  }, []);

  if (!isWeb) {
    return content;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ded7de' }}>
      <View
        style={{
          width: webFrame.width,
          height: webFrame.height,
          overflow: 'hidden',
          backgroundColor: colors.cream,
        }}
      >
        {content}
      </View>
    </View>
  );
}
