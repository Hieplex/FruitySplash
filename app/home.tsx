import { Animated, BackHandler, Image, ImageBackground, Pressable, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { backgroundRuntimeAssets, uiRuntimeAssets } from '@/game/assets/runtime-assets';
import { useScreenWipe } from '@/state/screen-wipe';
import { spacing } from '@/theme/spacing';

export default function HomeScreen() {
  const screenWipe = useScreenWipe();
  const playScale = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLogo(true), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showLogo) {
      return;
    }

    screenWipe.setScreenReady();
  }, [screenWipe, showLogo]);

  function animateTo(scale: Animated.Value, value: number) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    }).start();
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={backgroundRuntimeAssets.menu} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
        {showLogo ? (
          <Image
            source={uiRuntimeAssets.gameLogo}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              top: -250,
              alignSelf: 'center',
              width: '90%',
              aspectRatio: 1.5,
            }}
          />
        ) : null}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 44,
            alignItems: 'center',
            gap: spacing.sm,
            zIndex: 10,
            elevation: 10,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play"
            onPress={() => screenWipe.replace('/chapters')}
            onPressIn={() => animateTo(playScale, 0.94)}
            onPressOut={() => animateTo(playScale, 1)}
            style={{ width: 260, height: 92 }}
          >
            <Animated.View style={{ width: '100%', height: '100%', transform: [{ scale: playScale }] }}>
              <Image
                source={uiRuntimeAssets.buttonPlay}
                fadeDuration={0}
                resizeMode="contain"
                style={{ width: '100%', height: '100%' }}
              />
            </Animated.View>
          </Pressable>
            <Pressable
            accessibilityRole="button"
            accessibilityLabel="Exit"
            onPress={() => BackHandler.exitApp()}
            onPressIn={() => animateTo(exitScale, 0.94)}
            onPressOut={() => animateTo(exitScale, 1)}
            style={{ width: 350, height: 135 }}
          >
            <Animated.View style={{ width: '100%', height: '100%', transform: [{ scale: exitScale }] }}>
              <Image
                source={uiRuntimeAssets.buttonExit}
                fadeDuration={0}
                resizeMode="contain"
                style={{ width: '100%', height: '100%' }}
              />
            </Animated.View>
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}
