import { ActivityIndicator, Image, ImageBackground, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { warmTreeMapAssets } from '@/game/assets/preload-assets.native';
import { backgroundRuntimeAssets, uiRuntimeAssets } from '@/game/assets/runtime-assets';
import { useGoogleAuth } from '@/state/google-auth';
import { useScreenWipe } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';

const MIN_SPLASH_MS = 800;
const AUTH_FALLBACK_MS = 2200;
const MAP_NAVIGATION_FALLBACK_MS = 1200;

export default function HomeScreen() {
  const router = useRouter();
  const screenWipe = useScreenWipe();
  const googleAuth = useGoogleAuth();
  const openedAt = useRef(Date.now());
  const fallbackTimerDone = useRef(false);
  const [readyToEnter, setReadyToEnter] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void warmTreeMapAssets().finally(() => {
      if (!cancelled) {
        screenWipe.setScreenReady();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [screenWipe]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      fallbackTimerDone.current = true;
      setReadyToEnter(true);
    }, AUTH_FALLBACK_MS);

    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (!googleAuth.initialized && !fallbackTimerDone.current) {
      return;
    }

    const elapsedMs = Date.now() - openedAt.current;
    const delayMs = Math.max(0, MIN_SPLASH_MS - elapsedMs);
    const timer = setTimeout(() => {
      setReadyToEnter(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [googleAuth.initialized]);

  useEffect(() => {
    if (!readyToEnter) {
      return;
    }

    screenWipe.replace('/map');
    const fallbackTimer = setTimeout(() => {
      router.replace('/map');
    }, MAP_NAVIGATION_FALLBACK_MS);

    return () => clearTimeout(fallbackTimer);
  }, [readyToEnter, router, screenWipe]);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={backgroundRuntimeAssets.menu} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
        <Image
          source={uiRuntimeAssets.gameLogo}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: 18,
            alignSelf: 'center',
            width: '88%',
            maxHeight: 180,
            aspectRatio: 1.5,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '18%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={colors.cocoa} size="large" />
        </View>
      </ImageBackground>
    </View>
  );
}
