import { router } from 'expo-router';
import { Animated, BackHandler, Image, ImageBackground, Pressable, View } from 'react-native';
import { useRef } from 'react';
import { backgroundRuntimeAssets, uiRuntimeAssets } from '@/game/assets/runtime-assets';
import { spacing } from '@/theme/spacing';

export default function HomeScreen() {
  const playScale = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

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
      <ImageBackground source={backgroundRuntimeAssets.menu} resizeMode="cover" style={{ flex: 1 }}>
        <Image
          source={uiRuntimeAssets.gameLogo}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: -250,
            alignSelf: 'center',
            width: '90%',
            aspectRatio: 1.5,
          }}
        />
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
            onPress={() => router.replace('/map')}
            onPressIn={() => animateTo(playScale, 0.94)}
            onPressOut={() => animateTo(playScale, 1)}
            style={{ width: 260, height: 92 }}
          >
            <Animated.View style={{ width: '100%', height: '100%', transform: [{ scale: playScale }] }}>
              <Image
                source={uiRuntimeAssets.buttonPlay}
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
