import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, View, Easing } from 'react-native';
import { fruitRuntimeAssetIds, fruitRuntimeAssets, vfxRuntimeAssets } from '@/game/assets/runtime-assets';
import type { Position } from '@/game/types';
import { createMatchSplashParticlePlan } from '@/components/match-splash-plan';

export type MatchSplashCell = Position & {
  fruit: number;
};

export type MatchSplash = {
  key: number;
  chain: number;
  cells: MatchSplashCell[];
};

const SQUEEZE_DURATION_MS = 90;
const SHRINK_DURATION_MS = 300;
const SPLASH_DURATION_MS = 620;
const FLASH_PEAK_MS = 105;
const FLASH_FADE_MS = 300;
const CLOUD_PEAK_MS = 175;
const CLOUD_FADE_MS = 520;
const SPARKLE_START_MS = 70;
const SPARKLE_DURATION_MS = 360;

const SQUEEZE_PHASE_END = SQUEEZE_DURATION_MS / SPLASH_DURATION_MS;
const SHRINK_PHASE_END = SHRINK_DURATION_MS / SPLASH_DURATION_MS;

export function MatchSplashOverlay({
  splash,
  tileSize,
  gap,
  boardPadding,
  onComplete,
}: {
  splash: MatchSplash | null;
  tileSize: number;
  gap: number;
  boardPadding: number;
  boardPixelHeight: number;
  onComplete?: (key: number) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    if (!splash) {
      progress.setValue(0);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      easing: Easing.out(Easing.quad), // Added Easing.out to simulate initial snappy explosion velocity
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onCompleteRef.current?.(splash.key);
      }
    });

    return () => animation.stop();
  }, [progress, splash]);

  const cells = useMemo(() => splash?.cells.slice(0, 18) ?? [], [splash]);

  if (!splash) {
    return null;
  }

  const fruitScaleX = progress.interpolate({
    inputRange: [0, SQUEEZE_PHASE_END, SHRINK_PHASE_END],
    outputRange: [1, 0.65, 0.01],
    extrapolate: 'clamp',
  });
  const fruitScaleY = progress.interpolate({
    inputRange: [0, SQUEEZE_PHASE_END, SHRINK_PHASE_END],
    outputRange: [1, 1.4, 0.01],
    extrapolate: 'clamp',
  });
  const shrinkOpacity = progress.interpolate({
    inputRange: [0, SQUEEZE_PHASE_END, SHRINK_PHASE_END],
    outputRange: [1, 0.95, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        elevation: 20,
      }}
    >
      {cells.map((cell, cellIndex) => {
        const center = tileSize / 2;
        const plan = createMatchSplashParticlePlan({
          key: splash.key,
          row: cell.row,
          col: cell.col,
          fruit: cell.fruit,
        });
        const assetId = fruitRuntimeAssetIds[cell.fruit] ?? fruitRuntimeAssetIds[0];
        const fruitImageSize = Math.round(tileSize * 1.28);
        const mysteryCloudSize = Math.round(tileSize * 1.5);
        const coreFlashSize = Math.round(tileSize * 1.02);
        const sparkleBaseSize = Math.max(12, Math.round(tileSize * 0.22));
        const mysteryCloudScale = progress.interpolate({
          inputRange: [0, CLOUD_PEAK_MS / SPLASH_DURATION_MS, CLOUD_FADE_MS / SPLASH_DURATION_MS, 1],
          outputRange: [0.5, plan.mysteryCloud.scale, 0.98, 0.98],
          extrapolate: 'clamp',
        });
        const mysteryCloudOpacity = progress.interpolate({
          inputRange: [0, CLOUD_PEAK_MS / SPLASH_DURATION_MS, CLOUD_FADE_MS / SPLASH_DURATION_MS, 1],
          outputRange: [0, plan.mysteryCloud.opacity, 0.16, 0],
          extrapolate: 'clamp',
        });
        const coreFlashScale = progress.interpolate({
          inputRange: [0, FLASH_PEAK_MS / SPLASH_DURATION_MS, FLASH_FADE_MS / SPLASH_DURATION_MS, 1],
          outputRange: [0.28, plan.coreFlash.scale, 0.82, 0.82],
          extrapolate: 'clamp',
        });
        const coreFlashOpacity = progress.interpolate({
          inputRange: [0, FLASH_PEAK_MS / SPLASH_DURATION_MS, FLASH_FADE_MS / SPLASH_DURATION_MS, 1],
          outputRange: [0, plan.coreFlash.opacity, 0.08, 0],
          extrapolate: 'clamp',
        });

        return (
          <View
            key={`${splash.key}-${cell.row}-${cell.col}-${cellIndex}`}
            style={{
              position: 'absolute',
              top: boardPadding + cell.row * (tileSize + gap),
              left: boardPadding + cell.col * (tileSize + gap),
              width: tileSize,
              height: tileSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.Image
              source={vfxRuntimeAssets.mysteryCloud}
              resizeMode="contain"
              tintColor={plan.mysteryCloud.tintColor}
              style={{
                position: 'absolute',
                width: mysteryCloudSize,
                height: mysteryCloudSize,
                opacity: mysteryCloudOpacity,
                transform: [{ rotate: plan.mysteryCloud.rotate }, { scale: mysteryCloudScale }],
              }}
            />
            <Animated.Image
              source={fruitRuntimeAssets[assetId]}
              resizeMode="contain"
              style={{
                position: 'absolute',
                width: fruitImageSize,
                height: fruitImageSize,
                opacity: shrinkOpacity,
                transform: [{ scaleX: fruitScaleX }, { scaleY: fruitScaleY }],
              }}
            />
            <Animated.Image
              source={vfxRuntimeAssets.splashSparkle}
              resizeMode="contain"
              tintColor="#fff8ff"
              style={{
                position: 'absolute',
                width: coreFlashSize,
                height: coreFlashSize,
                opacity: coreFlashOpacity,
                transform: [{ rotate: plan.coreFlash.rotate }, { scale: coreFlashScale }],
              }}
            />
            {plan.sparkles.map((sparkle, sparkleIndex) => {
              const sparkleSize = Math.round(sparkleBaseSize * sparkle.size);
              const startAt = (SPARKLE_START_MS + sparkle.delayMs) / SPLASH_DURATION_MS;
              const peakAt = Math.min(0.72, startAt + 0.12);
              const endAt = Math.min(0.92, startAt + SPARKLE_DURATION_MS / SPLASH_DURATION_MS);
              const translateX = progress.interpolate({
                inputRange: [0, startAt, endAt, 1],
                outputRange: [0, 0, sparkle.driftX * tileSize, sparkle.driftX * tileSize],
              });
              const translateY = progress.interpolate({
                inputRange: [0, startAt, endAt, 1],
                outputRange: [0, 0, sparkle.driftY * tileSize, sparkle.driftY * tileSize],
              });
              const opacity = progress.interpolate({
                inputRange: [0, startAt, peakAt, endAt, 1],
                outputRange: [0, 0, sparkle.opacity, 0, 0],
                extrapolate: 'clamp',
              });
              const scale = progress.interpolate({
                inputRange: [0, startAt, peakAt, endAt],
                outputRange: [0.35, 0.35, 1.1, 0.48],
                extrapolate: 'clamp',
              });

              return (
                <Animated.Image
                  key={`sparkle-${sparkleIndex}`}
                  source={vfxRuntimeAssets.splashSparkle}
                  resizeMode="contain"
                  tintColor={sparkleIndex === 0 ? '#ffffff' : '#fff2b8'}
                  style={{
                    position: 'absolute',
                    top: center - sparkleSize / 2 + sparkle.startY * tileSize,
                    left: center - sparkleSize / 2 + sparkle.startX * tileSize,
                    width: sparkleSize,
                    height: sparkleSize,
                    opacity,
                    transform: [{ translateX }, { translateY }, { scale }],
                  }}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
