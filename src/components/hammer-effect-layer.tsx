import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View, type ImageSourcePropType } from 'react-native';
import { isHammerEffectCell, type HammerAnimation } from '@/components/hammer-effect-cell';
import { FruitTile } from '@/components/fruit-tile';
import { vfxRuntimeAssets } from '@/game/assets/runtime-assets';
import type { Board } from '@/game/types';

type HammerEffectLayerProps = {
  board: Board;
  animation: HammerAnimation;
  source: ImageSourcePropType;
  tileSize: number;
  gap: number;
  boardPadding: number;
  fruitImageScale: number;
  onComplete?: (key: number) => void;
};

// Animation phases durations (ms)
const HAMMER_SWING_DURATION_MS = 290;
const HAMMER_IMPACT_DURATION_MS = 180;
const HAMMER_CRACK_DURATION_MS = 480;
const HAMMER_FADE_DURATION_MS = 240;

export function HammerEffectLayer({
  board,
  animation,
  source,
  tileSize,
  gap,
  boardPadding,
  fruitImageScale,
  onComplete,
}: HammerEffectLayerProps) {
  // progress goes 0 -> 1 over the course of the complete animation
  const animationProgress = useRef(new Animated.Value(0)).current;
  const animatedHammerKey = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    if (animatedHammerKey.current === animation.key) {
      return;
    }

    animatedHammerKey.current = animation.key;
    animationProgress.setValue(0);

    const animationSequence = Animated.timing(animationProgress, {
      toValue: 1,
      duration: HAMMER_SWING_DURATION_MS + HAMMER_IMPACT_DURATION_MS + HAMMER_CRACK_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    animationSequence.start(({ finished }) => {
      if (finished) {
        onCompleteRef.current?.(animation.key);
      }
    });

    return () => {
      animationSequence.stop();
    };
  }, [animation, animationProgress]);

  // Normalized timestamps along the animationProgress timeline (0 -> 1)
  const TOTAL_DURATION = HAMMER_SWING_DURATION_MS + HAMMER_IMPACT_DURATION_MS + HAMMER_CRACK_DURATION_MS;
  const SWING_END = HAMMER_SWING_DURATION_MS / TOTAL_DURATION; // ~0.3
  const IMPACT_END = (HAMMER_SWING_DURATION_MS + HAMMER_IMPACT_DURATION_MS) / TOTAL_DURATION; // ~0.5
  const FADE_START = IMPACT_END;
  const FADE_END = 1.0;

  // 1. Hammer Swing & Rebound & Fade Translation
  const hammerTranslateX = animationProgress.interpolate({
    inputRange: [0, SWING_END, IMPACT_END, FADE_END],
    outputRange: [70, 0, -8, -15],
    extrapolate: 'clamp',
  });

  const hammerTranslateY = animationProgress.interpolate({
    inputRange: [0, SWING_END, IMPACT_END, FADE_END],
    outputRange: [-140, 0, -22, -35],
    extrapolate: 'clamp',
  });

  const hammerRotate = animationProgress.interpolate({
    inputRange: [0, SWING_END, IMPACT_END, FADE_END],
    outputRange: ['-55deg', '10deg', '-15deg', '-22deg'],
    extrapolate: 'clamp',
  });

  const hammerScale = animationProgress.interpolate({
    inputRange: [0, SWING_END, IMPACT_END, FADE_END],
    outputRange: [1.38, 1.08, 1.18, 1.14],
    extrapolate: 'clamp',
  });

  const hammerOpacity = animationProgress.interpolate({
    inputRange: [0, 0.08, FADE_START, FADE_END],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  // 2. Shockwave (Radial Ring expand)
  const shockwaveScale = animationProgress.interpolate({
    inputRange: [0, SWING_END, IMPACT_END, FADE_END],
    outputRange: [0.1, 0.42, 1.88, 2.64],
    extrapolate: 'clamp',
  });

  const shockwaveOpacity = animationProgress.interpolate({
    inputRange: [0, SWING_END, SWING_END + 0.05, IMPACT_END, FADE_END],
    outputRange: [0, 0, 1.0, 0.72, 0],
    extrapolate: 'clamp',
  });

  // 3. Tile Squeeze & Pop on Impact
  const tileScaleX = animationProgress.interpolate({
    inputRange: [0, SWING_END, SWING_END + 0.06, IMPACT_END, FADE_END],
    outputRange: [1, 1.28, 0.72, 1.14, 0.01],
    extrapolate: 'clamp',
  });

  const tileScaleY = animationProgress.interpolate({
    inputRange: [0, SWING_END, SWING_END + 0.06, IMPACT_END, FADE_END],
    outputRange: [1, 0.62, 1.28, 0.88, 0.01],
    extrapolate: 'clamp',
  });

  const tileOpacity = animationProgress.interpolate({
    inputRange: [0, IMPACT_END, FADE_END],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  // 4. Ground/Cracks impact effect
  const crackOpacity = animationProgress.interpolate({
    inputRange: [0, SWING_END, SWING_END + 0.04, FADE_END],
    outputRange: [0, 0, 0.9, 0],
    extrapolate: 'clamp',
  });

  const crackScale = animationProgress.interpolate({
    inputRange: [0, SWING_END, SWING_END + 0.06, FADE_END],
    outputRange: [0.35, 0.94, 1.12, 1.24],
    extrapolate: 'clamp',
  });

  const size = Math.round(tileSize * 1.62);
  const targetX = animation.target.col * (tileSize + gap) + tileSize / 2 - size / 2;
  const targetY = animation.target.row * (tileSize + gap) + tileSize / 2 - size / 2;

  const targetFruit = board[animation.target.row]?.[animation.target.col] ?? 0;

  return (
    <>
      {/* 1. Cracked ground layer under the fruit tile */}
      <Animated.Image
        source={vfxRuntimeAssets.bombShockwave}
        fadeDuration={0}
        resizeMode="contain"
        tintColor="#d94baf"
        style={{
          position: 'absolute',
          top: boardPadding + targetY,
          left: boardPadding + targetX,
          width: size,
          height: size,
          opacity: crackOpacity,
          transform: [{ scale: crackScale }],
          zIndex: 10,
        }}
      />

      {/* 2. Target fruit tile squashed/stretched under impact */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: boardPadding,
          left: boardPadding,
          right: boardPadding,
          bottom: boardPadding,
          zIndex: 15,
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: animation.target.row * (tileSize + gap),
            left: animation.target.col * (tileSize + gap),
            width: tileSize,
            height: tileSize,
            opacity: tileOpacity,
            transform: [{ scaleX: tileScaleX }, { scaleY: tileScaleY }],
          }}
        >
          <FruitTile
            fruit={targetFruit}
            size={tileSize}
            imageScale={fruitImageScale}
            selected={false}
            onPress={() => undefined}
          />
        </Animated.View>
      </View>

      {/* 3. Radial shockwave flash expanding outward */}
      <Animated.Image
        source={vfxRuntimeAssets.bombShockwave}
        fadeDuration={0}
        resizeMode="contain"
        tintColor="#fff8ff"
        style={{
          position: 'absolute',
          top: boardPadding + targetY,
          left: boardPadding + targetX,
          width: size,
          height: size,
          opacity: shockwaveOpacity,
          transform: [{ scale: shockwaveScale }],
          zIndex: 25,
        }}
      />

      {/* 4. Hammer tool animation overlay */}
      <Animated.Image
        source={source}
        fadeDuration={0}
        resizeMode="contain"
        style={{
          position: 'absolute',
          top: boardPadding + targetY - 10, // Offset to hit fruit perfectly
          left: boardPadding + targetX + 10,
          width: size,
          height: size,
          opacity: hammerOpacity,
          transform: [
            { translateX: hammerTranslateX },
            { translateY: hammerTranslateY },
            { rotate: hammerRotate },
            { scale: hammerScale },
          ],
          zIndex: 35,
        }}
      />
    </>
  );
}
