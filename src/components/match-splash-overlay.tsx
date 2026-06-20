import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, View, Easing } from 'react-native';
import { MATCH_SPLASH_LAYER_DEPTH } from '@/components/game-board-layer-depths';
import { fruitRuntimeAssetIds, fruitRuntimeAssets, vfxRuntimeAssets } from '@/game/assets/runtime-assets';
import type { Position } from '@/game/types';
import { createMatchSplashParticlePlan } from '@/components/match-splash-plan';

export type MatchSplashCell = Position & {
  fruit: number;
  delayMs?: number;
};

export type MatchSplash = {
  key: number;
  chain: number;
  cells: MatchSplashCell[];
  durationMs?: number;
  preShrinkMs?: number;
};

const SPLASH_DURATION_MS = 200;
const FLASH_PEAK_MS = 35;
const FLASH_FADE_MS = 110;
const CLOUD_PEAK_MS = 60;
const CLOUD_FADE_MS = 155;
const SPARKLE_START_MS = 18;
const SPARKLE_DURATION_MS = 110;

function createSafeSparkleWindow(startAtRaw: number, durationRaw: number) {
  const SAFE_END_LIMIT = 0.92;
  const MIN_SEGMENT = 0.01;
  const startAt = Math.min(SAFE_END_LIMIT - MIN_SEGMENT * 2, Math.max(0, startAtRaw));
  const endAt = Math.min(SAFE_END_LIMIT, Math.max(startAt + MIN_SEGMENT * 2, startAt + durationRaw));
  const peakAt = Math.min(endAt - MIN_SEGMENT, Math.max(startAt + MIN_SEGMENT, startAt + 0.12));

  return { startAt, peakAt, endAt };
}

function shiftWindow(startAt: number, peakAt: number, endAt: number, offset: number) {
  const maxOffset = 0.86;
  const clampedOffset = Math.max(0, Math.min(maxOffset, offset));
  const shiftedStart = Math.min(0.9, startAt + clampedOffset);
  const shiftedPeak = Math.min(0.95, peakAt + clampedOffset);
  const shiftedEnd = Math.min(1, endAt + clampedOffset);

  return {
    startAt: shiftedStart,
    peakAt: Math.max(shiftedStart + 0.01, shiftedPeak),
    endAt: Math.max(shiftedPeak + 0.01, shiftedEnd),
  };
}

function getSparkleLimitForCellCount(cellCount: number) {
  if (cellCount >= 6) {
    return 3;
  }
  if (cellCount >= 5) {
    return 4;
  }

  return 5;
}

export const MatchSplashOverlay = memo(function MatchSplashOverlay({
  splash,
  tileSize,
  fruitImageScale,
  gap,
  boardPadding,
  onComplete,
}: {
  splash: MatchSplash | null;
  tileSize: number;
  fruitImageScale: number;
  gap: number;
  boardPadding: number;
  onComplete?: (key: number) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  const cells = useMemo(() => splash?.cells.slice(0, 18) ?? [], [splash]);
  const plannedCells = useMemo(() => {
    if (!splash) {
      return [];
    }

    const sparkleLimit = getSparkleLimitForCellCount(cells.length);

    return cells.map((cell) => ({
      cell,
      assetId: fruitRuntimeAssetIds[cell.fruit] ?? fruitRuntimeAssetIds[0],
      plan: createMatchSplashParticlePlan({
        key: splash.key,
        row: cell.row,
        col: cell.col,
        fruit: cell.fruit,
        sparkleLimit,
      }),
    }));
  }, [cells, splash]);
  const maxDelayMs = useMemo(
    () => cells.reduce((current, cell) => Math.max(current, cell.delayMs ?? 0), 0),
    [cells],
  );
  const splashDurationMs = splash?.durationMs ?? SPLASH_DURATION_MS;
  const preShrinkMs = splash?.preShrinkMs ?? 0;
  const totalDurationMs = preShrinkMs + splashDurationMs + maxDelayMs;

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
      duration: totalDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onCompleteRef.current?.(splash.key);
      }
    });

    return () => animation.stop();
  }, [progress, splash, totalDurationMs]);

  if (!splash) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: MATCH_SPLASH_LAYER_DEPTH.zIndex,
        elevation: MATCH_SPLASH_LAYER_DEPTH.elevation,
      }}
    >
      {plannedCells.map(({ cell, assetId, plan }, cellIndex) => {
        const center = tileSize / 2;
        const cellDelayMs = cell.delayMs ?? 0;
        const totalDuration = Math.max(1, totalDurationMs);
        const preShrinkStartAt = preShrinkMs > 0 ? cellDelayMs / totalDuration : 0;
        const preShrinkEndAt =
          preShrinkMs > 0 ? (cellDelayMs + preShrinkMs) / totalDuration : preShrinkStartAt;
        const preShrinkHoldAt = Math.max(0, preShrinkStartAt - 0.001);
        const fruitImageSize = Math.round(tileSize * fruitImageScale);
        const mysteryCloudSize = Math.round(tileSize * 1.5);
        const coreFlashSize = Math.round(tileSize * 1.02);
        const sparkleBaseSize = Math.max(12, Math.round(tileSize * 0.22));
        const mysteryCloudWindow = shiftWindow(
          preShrinkMs / totalDuration,
          (preShrinkMs + CLOUD_PEAK_MS) / totalDuration,
          (preShrinkMs + CLOUD_FADE_MS) / totalDuration,
          cellDelayMs / totalDuration,
        );
        const coreFlashWindow = shiftWindow(
          preShrinkMs / totalDuration,
          (preShrinkMs + FLASH_PEAK_MS) / totalDuration,
          (preShrinkMs + FLASH_FADE_MS) / totalDuration,
          cellDelayMs / totalDuration,
        );
        const preShrinkScale = progress.interpolate({
          inputRange:
            preShrinkStartAt <= 0.001
              ? [0, Math.max(0.001, preShrinkEndAt)]
              : [0, preShrinkHoldAt, preShrinkStartAt, Math.max(preShrinkStartAt + 0.001, preShrinkEndAt)],
          outputRange: preShrinkStartAt <= 0.001 ? [1, 0.15] : [1, 1, 1, 0.15],
          extrapolate: 'clamp',
        });
        const preShrinkOpacity = progress.interpolate({
          inputRange:
            preShrinkStartAt <= 0.001
              ? [0, Math.max(0.001, preShrinkEndAt)]
              : [0, preShrinkHoldAt, preShrinkStartAt, Math.max(preShrinkStartAt + 0.001, preShrinkEndAt)],
          outputRange: preShrinkStartAt <= 0.001 ? [1, 0] : [1, 1, 1, 0],
          extrapolate: 'clamp',
        });
        const mysteryCloudScale = progress.interpolate({
          inputRange: [0, mysteryCloudWindow.startAt, mysteryCloudWindow.peakAt, mysteryCloudWindow.endAt, 1],
          outputRange: [0.5, 0.5, plan.mysteryCloud.scale, 0.98, 0.98],
          extrapolate: 'clamp',
        });
        const mysteryCloudOpacity = progress.interpolate({
          inputRange: [0, mysteryCloudWindow.startAt, mysteryCloudWindow.peakAt, mysteryCloudWindow.endAt, 1],
          outputRange: [0, 0, plan.mysteryCloud.opacity, 0.16, 0],
          extrapolate: 'clamp',
        });
        const coreFlashScale = progress.interpolate({
          inputRange: [0, coreFlashWindow.startAt, coreFlashWindow.peakAt, coreFlashWindow.endAt, 1],
          outputRange: [0.28, 0.28, plan.coreFlash.scale, 0.82, 0.82],
          extrapolate: 'clamp',
        });
        const coreFlashOpacity = progress.interpolate({
          inputRange: [0, coreFlashWindow.startAt, coreFlashWindow.peakAt, coreFlashWindow.endAt, 1],
          outputRange: [0, 0, plan.coreFlash.opacity, 0.08, 0],
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
            {preShrinkMs > 0 ? (
              <Animated.Image
                source={fruitRuntimeAssets[assetId]}
                resizeMode="contain"
                style={{
                  position: 'absolute',
                  width: fruitImageSize,
                  height: fruitImageSize,
                  opacity: preShrinkOpacity,
                  transform: [{ scaleX: preShrinkScale }, { scaleY: preShrinkScale }],
                }}
              />
            ) : null}
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
              const { startAt, peakAt, endAt } = createSafeSparkleWindow(
                (SPARKLE_START_MS + sparkle.delayMs + (cell.delayMs ?? 0)) / totalDurationMs,
                SPARKLE_DURATION_MS / totalDurationMs,
              );
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
});
