import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { FruitTile, FruitTileImage } from '@/components/fruit-tile';
import {
  SPECIAL_MERGE_LAYER_DEPTH,
  getSpecialWipeLayerDepth,
} from '@/components/game-board-layer-depths';
import {
  createFruityCrossSplitWindow,
  createFruityCrossVisualPlan,
  createSpecialMergePlan,
  createSpecialWipePlan,
  getSpecialMergeAnimationDurationMs,
  type FruityCrossVisualDirection,
} from '@/components/special-cell-layer-plan';
import { createMatchSplashParticlePlan } from '@/components/match-splash-plan';
import { fruitRuntimeAssetIds, fruitRuntimeAssets, specialFruitRuntimeAssets, uiRuntimeAssets, vfxRuntimeAssets } from '@/game/assets/runtime-assets';
import { getCellFruit, isSpecialCell } from '@/game/board';
import { getSpecialFruitAssetVariant } from '@/game/special-fruit-assets';
import type { Board, DropMotion, Fruit, Position, RowClearTravelDirection, SpecialCell, SpecialCellKind, SpecialWipeSourceTool } from '@/game/types';
import type { SpecialWipeChain } from '@/gameplay/match-cascade';
import { getLineRocketCellDelayMs } from '@/gameplay/direct-power-tools';
import type { DropMotionTiming } from '@/gameplay/drop-timing';
import {
  FRUITY_CROSS_GROUP_DROP_MS,
  LIGHTNING_FRUITS_CONTACT_RATIO,
  SPECIAL_WIPE_PRE_SHRINK_MS,
  SPECIAL_WIPE_SPLASH_DURATION_MS,
  getFruityCrossClearDelayMs,
  getFruityCrossSplitStartMs,
  getFruityCrossTravelEndMs,
  getLineRocketFadeStartMs,
  getLineRocketTravelEndMs,
  getSpecialWipeMaxDelayMs,
  getSpecialWipeDelayMs,
} from '@/gameplay/match-vfx-timing';

export type SpecialMergeAnimation = {
  key: number;
  board: Board;
  fruit: Fruit;
  sourceCells: Position[];
  hiddenCells?: Position[];
  targetCell: Position;
  special: SpecialCell;
};

export type SpecialWipeAnimation = {
  key: number;
  board: Board;
  origin: Position;
  kind: SpecialCellKind;
  cells: Position[];
  chainedWipes?: SpecialWipeChain[];
  targetFruit?: Fruit;
  sourceTool?: SpecialWipeSourceTool;
  rowTravelDirection?: RowClearTravelDirection;
  preDelayMs?: number;
  durationMs?: number;
  previewOnly?: boolean;
  groupDropCompleted?: boolean;
  initialElapsedMs?: number;
  suppressLightningOverlay?: boolean;
};

type SpecialCellLayerProps = {
  mergeAnimation?: SpecialMergeAnimation | null;
  wipeAnimation?: SpecialWipeAnimation | null;
  tileSize: number;
  gap: number;
  boardPadding: number;
  fruitImageScale: number;
  mergeTargetDropMotion?: DropMotion;
  mergeTargetDropTiming?: DropMotionTiming;
  mergeTargetDropProgress?: Animated.Value;
  mergeTargetDropTotalDurationMs?: number;
  onMergeComplete?: (key: number) => void;
  onWipeComplete?: (key: number) => void;
};

const SPECIAL_MERGE_DURATION_MS = 420;
const SPECIAL_MERGE_PRE_SHRINK_MS = 70;
const SPECIAL_WIPE_DURATION_MS = 460;
const SPECIAL_MERGE_WAVE_STEP = 0.08;
const FRUITY_CROSS_FLASH_PEAK_MS = 35;
const FRUITY_CROSS_FLASH_FADE_MS = 110;
const FRUITY_CROSS_CLOUD_PEAK_MS = 60;
const FRUITY_CROSS_CLOUD_FADE_MS = 155;
const FRUITY_CROSS_SPARKLE_START_MS = 18;
const FRUITY_CROSS_SPARKLE_DURATION_MS = 110;
const LIGHTNING_STRIKE_START_AT = 0.08;
const LIGHTNING_STRIKE_CONTACT_AT = LIGHTNING_FRUITS_CONTACT_RATIO;
const LIGHTNING_STRIKE_HOLD_END_AT = 0.68;
const LIGHTNING_STRIKE_FADE_END_AT = 0.86;
const LIGHTNING_STRIKE_BOTTOM_ALPHA_INSET = 76 / 1254;
const noopPress = () => undefined;

function getSpecialFruitAssetSource(fruit?: Fruit, kind?: SpecialCellKind) {
  if (fruit === undefined || kind === undefined) {
    return null;
  }

  const assetId = fruitRuntimeAssetIds[fruit] ?? fruitRuntimeAssetIds[0];
  return specialFruitRuntimeAssets[assetId]?.[getSpecialFruitAssetVariant(kind)];
}

function shiftWipeWindow(startAt: number, peakAt: number, endAt: number, offset: number) {
  const shiftedStart = Math.min(0.94, startAt + offset);
  const shiftedPeak = Math.min(0.97, peakAt + offset);
  const shiftedEnd = Math.min(1, endAt + offset);

  return {
    startAt: shiftedStart,
    peakAt: Math.max(shiftedStart + 0.01, shiftedPeak),
    endAt: Math.max(shiftedPeak + 0.01, shiftedEnd),
  };
}

function createSafeFruityCrossSparkleWindow(startAtRaw: number, durationRaw: number) {
  const safeEndLimit = 0.92;
  const minSegment = 0.01;
  const startAt = Math.min(safeEndLimit - minSegment * 2, Math.max(0, startAtRaw));
  const endAt = Math.min(safeEndLimit, Math.max(startAt + minSegment * 2, startAt + durationRaw));
  const peakAt = Math.min(endAt - minSegment, Math.max(startAt + minSegment, startAt + 0.12));

  return { startAt, peakAt, endAt };
}

export function SpecialCellLayer({
  mergeAnimation,
  wipeAnimation,
  tileSize,
  gap,
  boardPadding,
  fruitImageScale,
  mergeTargetDropMotion,
  mergeTargetDropTiming,
  mergeTargetDropProgress,
  mergeTargetDropTotalDurationMs = 0,
  onMergeComplete,
  onWipeComplete,
}: SpecialCellLayerProps) {
  const mergeProgress = useRef(new Animated.Value(0)).current;
  const wipeProgress = useRef(new Animated.Value(0)).current;
  const animatedMergeKey = useRef<number | null>(null);
  const animatedWipeKey = useRef<number | null>(null);
  const onMergeCompleteRef = useRef(onMergeComplete);
  const onWipeCompleteRef = useRef(onWipeComplete);
  const specialMergeTotalDurationMs = SPECIAL_MERGE_PRE_SHRINK_MS + SPECIAL_MERGE_DURATION_MS;
  const specialMergePreShrinkEndAt = SPECIAL_MERGE_PRE_SHRINK_MS / specialMergeTotalDurationMs;
  const specialMergeAnimationDurationMs = getSpecialMergeAnimationDurationMs({
    mergeDurationMs: specialMergeTotalDurationMs,
    mergeTargetDropTotalDurationMs: mergeTargetDropMotion ? mergeTargetDropTotalDurationMs : 0,
  });
  const specialWipePreDelayMs = wipeAnimation?.preDelayMs ?? 0;
  const specialWipeTotalDurationMs = wipeAnimation?.durationMs ?? specialWipePreDelayMs + SPECIAL_WIPE_DURATION_MS;
  const specialWipeOffset = specialWipePreDelayMs / Math.max(1, specialWipeTotalDurationMs);
  const effectiveWipeSourceTool =
    wipeAnimation?.sourceTool ??
    (wipeAnimation?.kind === 'row-wipe' && wipeAnimation.rowTravelDirection ? 'lineRocket' : undefined);
  const isLineRocketWipe = effectiveWipeSourceTool === 'lineRocket' && wipeAnimation?.kind === 'row-wipe';
  const isFruityCrossWipe = wipeAnimation?.sourceTool === 'fruityCross' && wipeAnimation.kind === 'cross-wipe';
  const isLightningFruitsWipe =
    wipeAnimation?.sourceTool === 'lightningFruits' &&
    wipeAnimation.kind === 'color-clear' &&
    !wipeAnimation.suppressLightningOverlay;
  const isNormalSpecialWipe = !isFruityCrossWipe && !isLineRocketWipe && !isLightningFruitsWipe;
  const specialWipeLayerDepth = wipeAnimation
    ? getSpecialWipeLayerDepth({
        kind: wipeAnimation.kind,
        sourceTool: effectiveWipeSourceTool,
      })
    : null;
  const mergePlan = useMemo(
    () =>
      mergeAnimation
        ? createSpecialMergePlan({
            sourceCells: mergeAnimation.sourceCells,
            targetCell: mergeAnimation.targetCell,
          })
        : null,
    [mergeAnimation],
  );
  const rowWipePlan = useMemo(() => {
    if (!wipeAnimation || (wipeAnimation.kind !== 'row-wipe' && wipeAnimation.kind !== 'cross-wipe')) {
      return null;
    }

    const rowCells = wipeAnimation.cells.filter((cell) => cell.row === wipeAnimation.origin.row);

    return rowCells.length > 0
      ? createSpecialWipePlan({
          origin: wipeAnimation.origin,
          axis: 'row',
          cells: rowCells,
        })
      : null;
  }, [wipeAnimation]);
  const columnWipePlan = useMemo(() => {
    if (!wipeAnimation || (wipeAnimation.kind !== 'column-wipe' && wipeAnimation.kind !== 'cross-wipe')) {
      return null;
    }

    const columnCells = wipeAnimation.cells.filter((cell) => cell.col === wipeAnimation.origin.col);

    return columnCells.length > 0
      ? createSpecialWipePlan({
          origin: wipeAnimation.origin,
          axis: 'column',
          cells: columnCells,
        })
      : null;
  }, [wipeAnimation]);
  const fruityCrossVisualPlan = useMemo(() => {
    if (!wipeAnimation || !isFruityCrossWipe) {
      return null;
    }

    return createFruityCrossVisualPlan({
      origin: wipeAnimation.origin,
      rowCount: wipeAnimation.board.length,
      columnCount: wipeAnimation.board[0]?.length ?? 0,
    });
  }, [isFruityCrossWipe, wipeAnimation]);

  useEffect(() => {
    onMergeCompleteRef.current = onMergeComplete;
  }, [onMergeComplete]);

  useEffect(() => {
    onWipeCompleteRef.current = onWipeComplete;
  }, [onWipeComplete]);

  useLayoutEffect(() => {
    if (!mergeAnimation || !mergePlan || mergePlan.sourceCount === 0) {
      mergeProgress.setValue(0);
      animatedMergeKey.current = null;
      return;
    }
    if (animatedMergeKey.current === mergeAnimation.key) {
      return;
    }

    animatedMergeKey.current = mergeAnimation.key;
    mergeProgress.setValue(0);

    const animation = Animated.timing(mergeProgress, {
      toValue: 1,
      duration: specialMergeAnimationDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onMergeCompleteRef.current?.(mergeAnimation.key);
      }
    });

    return () => animation.stop();
  }, [mergeAnimation, mergePlan, mergeProgress, specialMergeAnimationDurationMs]);

  useLayoutEffect(() => {
    if (
      !wipeAnimation ||
      (wipeAnimation.kind !== 'color-clear' &&
        (!rowWipePlan || rowWipePlan.cellCount === 0) &&
        (!columnWipePlan || columnWipePlan.cellCount === 0))
    ) {
      wipeProgress.setValue(0);
      animatedWipeKey.current = null;
      return;
    }
    if (animatedWipeKey.current === wipeAnimation.key) {
      return;
    }

    animatedWipeKey.current = wipeAnimation.key;
    const initialProgress = Math.max(
      0,
      Math.min(0.98, (wipeAnimation.initialElapsedMs ?? 0) / Math.max(1, specialWipeTotalDurationMs)),
    );
    wipeProgress.setValue(initialProgress);

    const animation = Animated.timing(wipeProgress, {
      toValue: 1,
      duration: Math.max(1, specialWipeTotalDurationMs - (wipeAnimation.initialElapsedMs ?? 0)),
      easing: isFruityCrossWipe ? Easing.linear : Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !wipeAnimation.previewOnly) {
        onWipeCompleteRef.current?.(wipeAnimation.key);
      }
    });

    return () => animation.stop();
  }, [columnWipePlan, rowWipePlan, specialWipeTotalDurationMs, wipeAnimation, wipeProgress]);

  const renderSpecialMarker = (special: SpecialCell, size: number) => {
    const strokeColor =
      special.kind === 'column-wipe'
        ? '#dff5ff'
        : special.kind === 'color-clear'
          ? '#f6d8ff'
          : special.kind === 'cross-wipe'
            ? '#ffd9e8'
            : '#fff2bf';

    return (
      <>
        <View
          style={{
            position: 'absolute',
            inset: Math.max(2, Math.round(size * 0.1)),
            borderRadius: size / 2,
            borderWidth: Math.max(2, Math.round(size * 0.06)),
            borderColor: strokeColor,
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        />
        {special.kind === 'row-wipe' || special.kind === 'cross-wipe' ? (
          <View
            style={{
              position: 'absolute',
              top: size / 2 - 2,
              left: size / 2 - size * 0.22,
              width: size * 0.44,
              height: 4,
              borderRadius: 999,
              backgroundColor: strokeColor,
              opacity: 0.95,
            }}
          />
        ) : null}
        {special.kind === 'column-wipe' || special.kind === 'cross-wipe' ? (
          <View
            style={{
              position: 'absolute',
              top: size / 2 - size * 0.22,
              left: size / 2 - 2,
              width: 4,
              height: size * 0.44,
              borderRadius: 999,
              backgroundColor: strokeColor,
              opacity: 0.95,
            }}
          />
        ) : null}
        {special.kind === 'color-clear' ? (
          <>
            <View
              style={{
                position: 'absolute',
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: 999,
                backgroundColor: '#fff3ff',
                opacity: 0.98,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.48,
                height: size * 0.48,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: '#ffe3ff',
                opacity: 0.88,
              }}
            />
          </>
        ) : null}
      </>
    );
  };

  const renderColorClearBursts = () => {
    if (!wipeAnimation || wipeAnimation.kind !== 'color-clear') {
      return null;
    }

    return wipeAnimation.cells.map((cell) => {
      const distance =
        Math.abs(cell.row - wipeAnimation.origin.row) + Math.abs(cell.col - wipeAnimation.origin.col);
      const shiftedWindow = shiftWipeWindow(
        Math.min(0.7, distance * 0.05),
        Math.min(0.84, distance * 0.05 + 0.14),
        Math.min(1, distance * 0.05 + 0.28),
        specialWipeOffset,
      );

      return (
        <Animated.View
          key={`${wipeAnimation.key}-color-${cell.row}-${cell.col}`}
          style={{
            position: 'absolute',
            top: cell.row * (tileSize + gap),
            left: cell.col * (tileSize + gap),
            width: tileSize,
            height: tileSize,
            borderRadius: tileSize / 2,
            backgroundColor: 'rgba(246,216,255,0.58)',
            opacity: wipeProgress.interpolate({
              inputRange: [0, shiftedWindow.startAt, shiftedWindow.peakAt, shiftedWindow.endAt, 1],
              outputRange: [0, 0, 0.9, 0, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                scale: wipeProgress.interpolate({
                  inputRange: [0, shiftedWindow.startAt, shiftedWindow.peakAt, shiftedWindow.endAt],
                  outputRange: [0.35, 0.35, 1.06, 1.14],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}
        />
      );
    });
  };

  const renderNormalSpecialWipeCellClears = () => {
    if (!wipeAnimation || !isNormalSpecialWipe) {
      return null;
    }

    return wipeAnimation.cells.map((cell, cellIndex) => {
      const source = wipeAnimation.board[cell.row]?.[cell.col];
      if (!source) {
        return null;
      }

      const fruit = getCellFruit(source);
      const assetId = fruitRuntimeAssetIds[fruit] ?? fruitRuntimeAssetIds[0];
      const specialClearCellAsset = isSpecialCell(source)
        ? getSpecialFruitAssetSource(source.fruit, source.kind)
        : null;
      const plan = createMatchSplashParticlePlan({
        key: wipeAnimation.key,
        row: cell.row,
        col: cell.col,
        fruit,
      });
      const cellDelayMs = getSpecialWipeDelayMs(cell, wipeAnimation.origin);
      const totalDuration = Math.max(1, specialWipeTotalDurationMs);
      const shrinkStartAt = Math.min(
        0.98,
        Math.max(0, (specialWipePreDelayMs + cellDelayMs) / totalDuration),
      );
      const shrinkEndAt = Math.min(
        0.995,
        Math.max(0, (specialWipePreDelayMs + cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS) / totalDuration),
      );
      const cloudStartAt = shrinkEndAt;
      const cloudPeakAt = Math.min(0.99, cloudStartAt + FRUITY_CROSS_CLOUD_PEAK_MS / totalDuration);
      const cloudEndAt = Math.min(1, cloudStartAt + FRUITY_CROSS_CLOUD_FADE_MS / totalDuration);
      const flashPeakAt = Math.min(0.99, cloudStartAt + FRUITY_CROSS_FLASH_PEAK_MS / totalDuration);
      const flashEndAt = Math.min(1, cloudStartAt + FRUITY_CROSS_FLASH_FADE_MS / totalDuration);
      const fruitImageSize = Math.round(tileSize * fruitImageScale);
      const mysteryCloudSize = Math.round(tileSize * 1.45);
      const coreFlashSize = Math.round(tileSize * 1.02);
      const sparkleBaseSize = Math.max(12, Math.round(tileSize * 0.2));
      const center = tileSize / 2;
      const fruitScale = wipeProgress.interpolate({
        inputRange: [0, Math.max(0.001, shrinkStartAt), Math.max(shrinkStartAt + 0.001, shrinkEndAt), 1],
        outputRange: [1, 1, 0.15, 0.15],
        extrapolate: 'clamp',
      });
      const fruitOpacity = wipeProgress.interpolate({
        inputRange: [0, Math.max(0.001, shrinkStartAt), Math.max(shrinkStartAt + 0.001, shrinkEndAt), 1],
        outputRange: [1, 1, 0, 0],
        extrapolate: 'clamp',
      });
      const mysteryCloudScale = wipeProgress.interpolate({
        inputRange: [0, cloudStartAt, cloudPeakAt, cloudEndAt, 1],
        outputRange: [0.5, 0.5, plan.mysteryCloud.scale, 0.98, 0.98],
        extrapolate: 'clamp',
      });
      const mysteryCloudOpacity = wipeProgress.interpolate({
        inputRange: [0, cloudStartAt, cloudPeakAt, cloudEndAt, 1],
        outputRange: [0, 0, plan.mysteryCloud.opacity, 0.16, 0],
        extrapolate: 'clamp',
      });
      const coreFlashScale = wipeProgress.interpolate({
        inputRange: [0, cloudStartAt, flashPeakAt, flashEndAt, 1],
        outputRange: [0.28, 0.28, plan.coreFlash.scale, 0.82, 0.82],
        extrapolate: 'clamp',
      });
      const coreFlashOpacity = wipeProgress.interpolate({
        inputRange: [0, cloudStartAt, flashPeakAt, flashEndAt, 1],
        outputRange: [0, 0, plan.coreFlash.opacity, 0.08, 0],
        extrapolate: 'clamp',
      });

      return (
        <View
          key={`${wipeAnimation.key}-normal-special-clear-${cell.row}-${cell.col}-${cellIndex}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: cell.row * (tileSize + gap),
            left: cell.col * (tileSize + gap),
            width: tileSize,
            height: tileSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.Image
            source={specialClearCellAsset ?? fruitRuntimeAssets[assetId]}
            resizeMode="contain"
            style={{
              position: 'absolute',
              width: fruitImageSize,
              height: fruitImageSize,
              opacity: fruitOpacity,
              transform: [{ scaleX: fruitScale }, { scaleY: fruitScale }],
            }}
          />
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
          {plan.sparkles.slice(0, 4).map((sparkle, sparkleIndex) => {
            const sparkleSize = Math.round(sparkleBaseSize * sparkle.size);
            const { startAt, peakAt, endAt } = createSafeFruityCrossSparkleWindow(
              cloudStartAt + (FRUITY_CROSS_SPARKLE_START_MS + sparkle.delayMs) / totalDuration,
              FRUITY_CROSS_SPARKLE_DURATION_MS / totalDuration,
            );
            const translateX = wipeProgress.interpolate({
              inputRange: [0, startAt, endAt, 1],
              outputRange: [0, 0, sparkle.driftX * tileSize, sparkle.driftX * tileSize],
              extrapolate: 'clamp',
            });
            const translateY = wipeProgress.interpolate({
              inputRange: [0, startAt, endAt, 1],
              outputRange: [0, 0, sparkle.driftY * tileSize, sparkle.driftY * tileSize],
              extrapolate: 'clamp',
            });
            const opacity = wipeProgress.interpolate({
              inputRange: [0, startAt, peakAt, endAt, 1],
              outputRange: [0, 0, sparkle.opacity, 0, 0],
              extrapolate: 'clamp',
            });
            const scale = wipeProgress.interpolate({
              inputRange: [0, startAt, peakAt, endAt],
              outputRange: [0.35, 0.35, 1.1, 0.48],
              extrapolate: 'clamp',
            });

            return (
              <Animated.Image
                key={`normal-special-sparkle-${sparkleIndex}`}
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
    });
  };

  const renderLightningFruitsOverlay = () => {
    if (!wipeAnimation || !isLightningFruitsWipe) {
      return null;
    }

    const rowCount = wipeAnimation.board.length;
    const columnCount = wipeAnimation.board[0]?.length ?? 0;
    const boardPixelWidth = columnCount > 0 ? columnCount * tileSize + (columnCount - 1) * gap : 0;
    const boardPixelHeight = rowCount > 0 ? rowCount * tileSize + (rowCount - 1) * gap : 0;
    const strikeWidth = Math.round(tileSize * 1.45);
    const strikeHeight = Math.round(tileSize * 2.9);
    const strikeBottomInset = strikeHeight * LIGHTNING_STRIKE_BOTTOM_ALPHA_INSET;
    const groundSize = Math.round(tileSize * 1.35);
    const matchingCells = wipeAnimation.cells.filter((cell) => wipeAnimation.board[cell.row]?.[cell.col]);
    const overlayOpacity = wipeProgress.interpolate({
      inputRange: [0, LIGHTNING_STRIKE_START_AT, LIGHTNING_STRIKE_HOLD_END_AT, 1],
      outputRange: [0, 0.5, 0.5, 0],
      extrapolate: 'clamp',
    });
    const highlightOpacity = wipeProgress.interpolate({
      inputRange: [0, LIGHTNING_STRIKE_START_AT, LIGHTNING_STRIKE_FADE_END_AT, 1],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });
    const strikeOpacity = wipeProgress.interpolate({
      inputRange: [
        0,
        LIGHTNING_STRIKE_START_AT,
        LIGHTNING_STRIKE_START_AT + 0.02,
        LIGHTNING_STRIKE_HOLD_END_AT,
        LIGHTNING_STRIKE_FADE_END_AT,
        1,
      ],
      outputRange: [0, 0, 1, 1, 0, 0],
      extrapolate: 'clamp',
    });
    const strikeTranslateY = wipeProgress.interpolate({
      inputRange: [0, LIGHTNING_STRIKE_START_AT, LIGHTNING_STRIKE_CONTACT_AT, 1],
      outputRange: [-tileSize * 1.15, -tileSize * 1.15, 0, 0],
      extrapolate: 'clamp',
    });
    const groundOpacity = wipeProgress.interpolate({
      inputRange: [
        0,
        LIGHTNING_STRIKE_CONTACT_AT,
        LIGHTNING_STRIKE_CONTACT_AT + 0.04,
        LIGHTNING_STRIKE_HOLD_END_AT,
        LIGHTNING_STRIKE_FADE_END_AT,
        1,
      ],
      outputRange: [0, 0, 1, 0.92, 0, 0],
      extrapolate: 'clamp',
    });
    const groundScale = wipeProgress.interpolate({
      inputRange: [0, LIGHTNING_STRIKE_CONTACT_AT, LIGHTNING_STRIKE_CONTACT_AT + 0.12, LIGHTNING_STRIKE_FADE_END_AT],
      outputRange: [0.08, 0.08, 1, 1.08],
      extrapolate: 'clamp',
    });

    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: boardPixelWidth, height: boardPixelHeight }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: boardPixelWidth,
            height: boardPixelHeight,
            backgroundColor: '#000',
            opacity: overlayOpacity,
          }}
        />
        {matchingCells.map((cell) => {
          const source = wipeAnimation.board[cell.row]?.[cell.col];
          if (!source) {
            return null;
          }

          const fruit = getCellFruit(source);
          const lightningSpecial = isSpecialCell(source)
            ? { kind: source.kind, powerTier: source.powerTier }
            : null;
          const cellTop = cell.row * (tileSize + gap);
          const cellLeft = cell.col * (tileSize + gap);
          const shakeDistance = Math.max(4, Math.round(tileSize * 0.095));
          const shakeTranslateX = wipeProgress.interpolate({
            inputRange: [
              0,
              LIGHTNING_STRIKE_CONTACT_AT,
              LIGHTNING_STRIKE_CONTACT_AT + 0.025,
              LIGHTNING_STRIKE_CONTACT_AT + 0.05,
              LIGHTNING_STRIKE_CONTACT_AT + 0.075,
              LIGHTNING_STRIKE_CONTACT_AT + 0.11,
              LIGHTNING_STRIKE_CONTACT_AT + 0.16,
              LIGHTNING_STRIKE_HOLD_END_AT,
              1,
            ],
            outputRange: [0, 0, -shakeDistance, shakeDistance, -shakeDistance * 0.85, shakeDistance * 0.55, -shakeDistance * 0.28, 0, 0],
            extrapolate: 'clamp',
          });
          const shakeTranslateY = wipeProgress.interpolate({
            inputRange: [
              0,
              LIGHTNING_STRIKE_CONTACT_AT,
              LIGHTNING_STRIKE_CONTACT_AT + 0.025,
              LIGHTNING_STRIKE_CONTACT_AT + 0.055,
              LIGHTNING_STRIKE_CONTACT_AT + 0.09,
              LIGHTNING_STRIKE_CONTACT_AT + 0.14,
              LIGHTNING_STRIKE_HOLD_END_AT,
              1,
            ],
            outputRange: [0, 0, shakeDistance * 0.65, -shakeDistance * 0.55, shakeDistance * 0.4, -shakeDistance * 0.22, 0, 0],
            extrapolate: 'clamp',
          });
          const shakeScale = wipeProgress.interpolate({
            inputRange: [0, LIGHTNING_STRIKE_CONTACT_AT, LIGHTNING_STRIKE_CONTACT_AT + 0.08, LIGHTNING_STRIKE_HOLD_END_AT, 1],
            outputRange: [1, 1, 1.09, 1, 1],
            extrapolate: 'clamp',
          });

          return (
            <View key={`${wipeAnimation.key}-lightning-${cell.row}-${cell.col}`} pointerEvents="none">
              <Animated.View
                style={{
                  position: 'absolute',
                  top: cellTop,
                  left: cellLeft,
                  width: tileSize,
                  height: tileSize,
                  opacity: highlightOpacity,
                  transform: [{ translateX: shakeTranslateX }, { translateY: shakeTranslateY }, { scale: shakeScale }],
                }}
              >
                <FruitTile
                  fruit={fruit}
                  size={tileSize}
                  imageScale={fruitImageScale}
                  selected={false}
                  special={lightningSpecial}
                  onPress={noopPress}
                  disabled
                />
              </Animated.View>
              <Animated.Image
                source={uiRuntimeAssets.gameplayLightningComeDown}
                resizeMode="stretch"
                style={{
                  position: 'absolute',
                  top: cellTop + tileSize / 2 - strikeHeight + strikeBottomInset,
                  left: cellLeft + tileSize / 2 - strikeWidth / 2,
                  width: strikeWidth,
                  height: strikeHeight,
                  opacity: strikeOpacity,
                  transform: [{ translateY: strikeTranslateY }],
                }}
              />
              <Animated.Image
                source={uiRuntimeAssets.gameplayGroundLightning}
                resizeMode="contain"
                style={{
                  position: 'absolute',
                  top: cellTop + tileSize / 2 - groundSize / 2,
                  left: cellLeft + tileSize / 2 - groundSize / 2,
                  width: groundSize,
                  height: groundSize,
                  opacity: groundOpacity,
                  transform: [{ scale: groundScale }],
                }}
              />
            </View>
          );
        })}
      </View>
    );
  };

  const renderFruityCross = () => {
    if (!wipeAnimation || !isFruityCrossWipe || !fruityCrossVisualPlan) {
      return null;
    }

    const groupSize = Math.max(60, Math.round(tileSize * fruityCrossVisualPlan.groupScale));
    const armSize = Math.max(28, Math.round(groupSize * 0.42));
    const originCenterTop = wipeAnimation.origin.row * (tileSize + gap) + tileSize / 2-1;
    const originCenterLeft = wipeAnimation.origin.col * (tileSize + gap) + tileSize / 2;
    const groupTop = originCenterTop - groupSize / 2;
    const groupLeft = originCenterLeft - groupSize / 2;
    const armTop = originCenterTop - armSize / 2;
    const armLeft = originCenterLeft - armSize / 2;
    const fruityCrossTimelineDuration = Math.max(1, specialWipeTotalDurationMs);
    const maxWaveDelayMs = getSpecialWipeMaxDelayMs(wipeAnimation.cells, wipeAnimation.origin);
    const completedGroupDropMs = wipeAnimation.groupDropCompleted ? FRUITY_CROSS_GROUP_DROP_MS : 0;
    const getTimelineAt = (timeMs: number) =>
      Math.max(0, Math.min(0.995, (timeMs - completedGroupDropMs) / fruityCrossTimelineDuration));
    const groupLandAt = wipeAnimation.groupDropCompleted
      ? 0
      : Math.min(0.9, FRUITY_CROSS_GROUP_DROP_MS / fruityCrossTimelineDuration);
    const splitStartAt = Math.min(0.96, Math.max(groupLandAt + 0.001, getTimelineAt(getFruityCrossSplitStartMs())));
    const splitEndAt = Math.min(
      0.995,
      Math.max(
        splitStartAt + 0.04,
        getTimelineAt(getFruityCrossTravelEndMs(maxWaveDelayMs)),
      ),
    );
    const splitWindow = createFruityCrossSplitWindow({ splitStartAt, splitEndAt });
    const armSources: Record<FruityCrossVisualDirection, number> = {
      top: uiRuntimeAssets.gameplayFruityCrossTop,
      down: uiRuntimeAssets.gameplayFruityCrossDown,
      left: uiRuntimeAssets.gameplayFruityCrossLeft,
      right: uiRuntimeAssets.gameplayFruityCrossRight,
    };
    const mergedOffsets: Record<FruityCrossVisualDirection, { x: number; y: number }> = {
      top: { x: 0, y: -armSize * 0.28 },
      down: { x: 0, y: armSize * 0.28 },
      left: { x: -armSize * 0.3, y: 0 },
      right: { x: armSize * 0.3, y: 0 },
    };
    const renderClearCells = () =>
      wipeAnimation.previewOnly
        ? null
        : wipeAnimation.cells.map((cell, cellIndex) => {
        const source = wipeAnimation.board[cell.row]?.[cell.col];
        if (!source) {
          return null;
        }

        const fruit = getCellFruit(source);
        const assetId = fruitRuntimeAssetIds[fruit] ?? fruitRuntimeAssetIds[0];
        const specialClearCellAsset = isSpecialCell(source)
          ? getSpecialFruitAssetSource(source.fruit, source.kind)
          : null;
        const plan = createMatchSplashParticlePlan({
          key: wipeAnimation.key,
          row: cell.row,
          col: cell.col,
          fruit,
        });
        const cellDelayMs = getFruityCrossClearDelayMs(getSpecialWipeDelayMs(cell, wipeAnimation.origin));
        const totalDuration = Math.max(1, specialWipeTotalDurationMs);
        const shrinkStartAt = Math.min(0.98, Math.max(0, (cellDelayMs - completedGroupDropMs) / totalDuration));
        const shrinkEndAt = Math.min(0.995, Math.max(0, (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS - completedGroupDropMs) / totalDuration));
        const cloudStartAt = Math.min(0.98, Math.max(0, (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS - completedGroupDropMs) / totalDuration));
        const cloudPeakAt = Math.min(0.99, Math.max(0, (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS + FRUITY_CROSS_CLOUD_PEAK_MS - completedGroupDropMs) / totalDuration));
        const cloudEndAt = Math.min(1, Math.max(0, (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS + FRUITY_CROSS_CLOUD_FADE_MS - completedGroupDropMs) / totalDuration));
        const flashStartAt = cloudStartAt;
        const flashPeakAt = Math.min(0.99, (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS + FRUITY_CROSS_FLASH_PEAK_MS) / totalDuration);
        const flashEndAt = Math.min(1, (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS + FRUITY_CROSS_FLASH_FADE_MS) / totalDuration);
        const fruitImageSize = Math.round(tileSize * fruitImageScale);
        const mysteryCloudSize = Math.round(tileSize * 1.5);
        const coreFlashSize = Math.round(tileSize * 1.02);
        const sparkleBaseSize = Math.max(12, Math.round(tileSize * 0.22));
        const center = tileSize / 2;
        const fruitScale = wipeProgress.interpolate({
          inputRange: [0, Math.max(0.001, shrinkStartAt), Math.max(shrinkStartAt + 0.001, shrinkEndAt), 1],
          outputRange: [1, 1, 0.15, 0.15],
          extrapolate: 'clamp',
        });
        const fruitOpacity = wipeProgress.interpolate({
          inputRange: [0, Math.max(0.001, shrinkStartAt), Math.max(shrinkStartAt + 0.001, shrinkEndAt), 1],
          outputRange: [1, 1, 0, 0],
          extrapolate: 'clamp',
        });
        const mysteryCloudScale = wipeProgress.interpolate({
          inputRange: [0, cloudStartAt, cloudPeakAt, cloudEndAt, 1],
          outputRange: [0.5, 0.5, plan.mysteryCloud.scale, 0.98, 0.98],
          extrapolate: 'clamp',
        });
        const mysteryCloudOpacity = wipeProgress.interpolate({
          inputRange: [0, cloudStartAt, cloudPeakAt, cloudEndAt, 1],
          outputRange: [0, 0, plan.mysteryCloud.opacity, 0.16, 0],
          extrapolate: 'clamp',
        });
        const coreFlashScale = wipeProgress.interpolate({
          inputRange: [0, flashStartAt, flashPeakAt, flashEndAt, 1],
          outputRange: [0.28, 0.28, plan.coreFlash.scale, 0.82, 0.82],
          extrapolate: 'clamp',
        });
        const coreFlashOpacity = wipeProgress.interpolate({
          inputRange: [0, flashStartAt, flashPeakAt, flashEndAt, 1],
          outputRange: [0, 0, plan.coreFlash.opacity, 0.08, 0],
          extrapolate: 'clamp',
        });

        return (
          <View
            key={`${wipeAnimation.key}-fruity-cross-clear-${cell.row}-${cell.col}-${cellIndex}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: cell.row * (tileSize + gap),
              left: cell.col * (tileSize + gap),
              width: tileSize,
              height: tileSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.Image
              source={specialClearCellAsset ?? fruitRuntimeAssets[assetId]}
              resizeMode="contain"
              style={{
                position: 'absolute',
                width: fruitImageSize,
                height: fruitImageSize,
                opacity: fruitOpacity,
                transform: [{ scaleX: fruitScale }, { scaleY: fruitScale }],
              }}
            />
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
              const { startAt, peakAt, endAt } = createSafeFruityCrossSparkleWindow(
                (cellDelayMs + SPECIAL_WIPE_PRE_SHRINK_MS + FRUITY_CROSS_SPARKLE_START_MS + sparkle.delayMs - completedGroupDropMs) / totalDuration,
                FRUITY_CROSS_SPARKLE_DURATION_MS / totalDuration,
              );
              const translateX = wipeProgress.interpolate({
                inputRange: [0, startAt, endAt, 1],
                outputRange: [0, 0, sparkle.driftX * tileSize, sparkle.driftX * tileSize],
              });
              const translateY = wipeProgress.interpolate({
                inputRange: [0, startAt, endAt, 1],
                outputRange: [0, 0, sparkle.driftY * tileSize, sparkle.driftY * tileSize],
              });
              const opacity = wipeProgress.interpolate({
                inputRange: [0, startAt, peakAt, endAt, 1],
                outputRange: [0, 0, sparkle.opacity, 0, 0],
                extrapolate: 'clamp',
              });
              const scale = wipeProgress.interpolate({
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
        });

    const groupTranslateY = wipeAnimation.groupDropCompleted
      ? 0
      : wipeProgress.interpolate({
          inputRange: [0, groupLandAt, splitStartAt, 1],
          outputRange: [
            -boardPadding - groupSize - fruityCrossVisualPlan.groupDropExtraPx - groupTop,
            0,
            0,
            0,
          ],
          extrapolate: 'clamp',
        });
    const groupOpacity = wipeAnimation.previewOnly
      ? wipeProgress.interpolate({
          inputRange: [0, 0.01, 1],
          outputRange: [0, 1, 1],
          extrapolate: 'clamp',
        })
      : wipeProgress.interpolate({
          inputRange: [0, 0.01, splitStartAt, Math.min(0.99, splitStartAt + 0.001), 1],
          outputRange: [0, 1, 1, 0, 0],
          extrapolate: 'clamp',
        });
    const groupScale = wipeAnimation.groupDropCompleted
      ? 1
      : wipeProgress.interpolate({
          inputRange: [0, groupLandAt, splitStartAt, 1],
          outputRange: [0.78, 1, 1, 1],
          extrapolate: 'clamp',
        });

    const arms = fruityCrossVisualPlan.arms.map((arm) => {
      const travelDistance = (arm.distance + 0.42) * (tileSize + gap);
      const mergedOffset = mergedOffsets[arm.direction];
      const translateX =
        arm.direction === 'left'
          ? wipeProgress.interpolate({
              inputRange: [0, splitStartAt, splitEndAt, 1],
              outputRange: [mergedOffset.x, mergedOffset.x, mergedOffset.x - travelDistance, mergedOffset.x - travelDistance],
              extrapolate: 'clamp',
            })
          : arm.direction === 'right'
            ? wipeProgress.interpolate({
                inputRange: [0, splitStartAt, splitEndAt, 1],
                outputRange: [mergedOffset.x, mergedOffset.x, mergedOffset.x + travelDistance, mergedOffset.x + travelDistance],
                extrapolate: 'clamp',
              })
            : mergedOffset.x;
      const translateY =
        arm.direction === 'top'
          ? wipeProgress.interpolate({
              inputRange: [0, splitStartAt, splitEndAt, 1],
              outputRange: [mergedOffset.y, mergedOffset.y, mergedOffset.y - travelDistance, mergedOffset.y - travelDistance],
              extrapolate: 'clamp',
            })
          : arm.direction === 'down'
            ? wipeProgress.interpolate({
                inputRange: [0, splitStartAt, splitEndAt, 1],
                outputRange: [mergedOffset.y, mergedOffset.y, mergedOffset.y + travelDistance, mergedOffset.y + travelDistance],
                extrapolate: 'clamp',
              })
            : mergedOffset.y;

      const scale = wipeProgress.interpolate({
        inputRange: [0, splitWindow.startAt, splitWindow.peakAt, splitWindow.endAt],
        outputRange: [0.96, 0.96, 1.04, 1.08],
        extrapolate: 'clamp',
      });
      const opacity = wipeProgress.interpolate({
        inputRange: [0, splitWindow.startAt, splitWindow.peakAt, splitWindow.fadeAt, splitWindow.endAt],
        outputRange: [
          0,
          0,
          fruityCrossVisualPlan.armPeakOpacity,
          fruityCrossVisualPlan.armTravelOpacity,
          0,
        ],
        extrapolate: 'clamp',
      });

      return (
        <Animated.Image
          key={`${wipeAnimation.key}-fruity-cross-${arm.direction}`}
          source={armSources[arm.direction]}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: armTop,
            left: armLeft,
            width: armSize,
            height: armSize,
            opacity,
            transform: [{ translateX }, { translateY }, { scale }],
          }}
        />
      );
    });
    const mergedGroupPieces = fruityCrossVisualPlan.arms.map((arm) => {
      const offset = mergedOffsets[arm.direction];

      return (
        <Animated.Image
          key={`${wipeAnimation.key}-fruity-cross-group-piece-${arm.direction}`}
          source={armSources[arm.direction]}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: groupSize / 2 - armSize / 2,
            left: groupSize / 2 - armSize / 2,
            width: armSize,
            height: armSize,
            transform: [{ translateX: offset.x }, { translateY: offset.y }],
          }}
        />
      );
    });

    return (
      <>
        {renderClearCells()}
        <Animated.View
          key={`${wipeAnimation.key}-fruity-cross-group`}
          style={{
            position: 'absolute',
            top: groupTop,
            left: groupLeft,
            width: groupSize,
            height: groupSize,
            opacity: groupOpacity,
            transform: [{ translateY: groupTranslateY }, { scale: groupScale }],
          }}
        >
          {mergedGroupPieces}
        </Animated.View>
        {wipeAnimation.previewOnly ? null : arms}
      </>
    );
  };

  const renderLineRocket = () => {
    if (!wipeAnimation || !isLineRocketWipe) {
      return null;
    }

    const columnCount = wipeAnimation.board[0]?.length ?? 0;
    if (columnCount <= 0) {
      return null;
    }

    const lastColumn = Math.max(0, columnCount - 1);
    const direction =
      wipeAnimation.rowTravelDirection ??
      (wipeAnimation.origin.col <= lastColumn - wipeAnimation.origin.col ? 'left-to-right' : 'right-to-left');
    const boardPixelWidth = columnCount * tileSize + (columnCount - 1) * gap;
    const maxDelayMs = wipeAnimation.cells.reduce(
      (maxDelay, cell) => Math.max(maxDelay, getLineRocketCellDelayMs(cell, columnCount, direction)),
      0,
    );
    const rocketSize = Math.max(36, Math.round(tileSize * 1.65));
    const wrapperWidth = Math.round(rocketSize * 1.85);
    const thrustBigSize = Math.round(rocketSize * 0.86);
    const thrustSmallSize = Math.round(rocketSize * 0.52);
    const travelEndMs = getLineRocketTravelEndMs(maxDelayMs, specialWipePreDelayMs);
    const fadeStartMs = getLineRocketFadeStartMs(maxDelayMs, specialWipePreDelayMs);
    const travelEndAt = Math.max(
      0.08,
      Math.min(0.9, travelEndMs / Math.max(1, specialWipeTotalDurationMs)),
    );
    const fadeStartAt = Math.max(travelEndAt, Math.min(0.96, fadeStartMs / Math.max(1, specialWipeTotalDurationMs)));
    const fadeEndAt = Math.min(1, fadeStartAt + 0.12);
    const startX = direction === 'left-to-right' ? -rocketSize * 1.2 : boardPixelWidth - rocketSize * 0.18;
    const endX = direction === 'left-to-right' ? boardPixelWidth - rocketSize * 0.18 : -rocketSize * 1.2;
    const rocketLeft = direction === 'left-to-right' ? Math.round(rocketSize * 0.42) : 0;
    const thrustLeft =
      direction === 'left-to-right'
        ? 0
        : Math.round(rocketSize * 1.08);
    const thrustBigTop = Math.round(rocketSize * 0.08);
    const thrustSmallTop = Math.round(rocketSize * 0.24);
    const thrustSmallLeftOffset = 0;
    const rocketRotation = direction === 'left-to-right' ? '52deg' : '-128deg';

    const translateX = wipeProgress.interpolate({
      inputRange: [0, travelEndAt, 1],
      outputRange: [startX, endX, endX],
      extrapolate: 'clamp',
    });
    const opacity = wipeProgress.interpolate({
      inputRange: [0, 0.03, fadeStartAt, fadeEndAt, 1],
      outputRange: [0, 1, 1, 0, 0],
      extrapolate: 'clamp',
    });
    const thrustScale = wipeProgress.interpolate({
      inputRange: [0, 0.18, 0.36, 0.54, 0.72, 1],
      outputRange: [0.92, 1.08, 0.96, 1.12, 0.98, 1.04],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={`${wipeAnimation.key}-line-rocket-${direction}`}
        style={{
          position: 'absolute',
          top: wipeAnimation.origin.row * (tileSize + gap) + tileSize / 2 - rocketSize / 2,
          left: 0,
          width: wrapperWidth,
          height: rocketSize,
          opacity,
          transform: [{ translateX }],
        }}
      >
        <Animated.Image
          key={`${wipeAnimation.key}-line-rocket-thrust-big-${direction}`}
          source={uiRuntimeAssets.gameplayLineRocketThrustBig}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: thrustBigTop,
            left: thrustLeft,
            width: thrustBigSize,
            height: thrustBigSize,
            opacity: 0.92,
            transform: [{ scale: thrustScale }, { rotate: rocketRotation }],
          }}
        />
        <Animated.Image
          key={`${wipeAnimation.key}-line-rocket-thrust-small-${direction}`}
          source={uiRuntimeAssets.gameplayLineRocketThrustSmall}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: thrustSmallTop,
            left: thrustLeft + thrustSmallLeftOffset,
            width: thrustSmallSize,
            height: thrustSmallSize,
            opacity: 0.98,
            transform: [{ scale: thrustScale }, { rotate: rocketRotation }],
          }}
        />
        <Animated.Image
          key={`${wipeAnimation.key}-line-rocket-image-${direction}`}
          source={uiRuntimeAssets.gameplayLineRocketImage}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: 0,
            left: rocketLeft,
            width: rocketSize,
            height: rocketSize,
            transform: [{ rotate: rocketRotation }],
          }}
        />
      </Animated.View>
    );
  };

  const specialTargetAsset = getSpecialFruitAssetSource(
    mergeAnimation?.special.fruit,
    mergeAnimation?.special.kind,
  );
  const mergeTargetDropTranslateY =
    mergeTargetDropMotion && mergeTargetDropTiming && mergeTargetDropProgress && mergeTargetDropTotalDurationMs > 0
      ? mergeTargetDropProgress.interpolate({
          inputRange: [
            0,
            mergeTargetDropTiming.startMs / mergeTargetDropTotalDurationMs,
            mergeTargetDropTiming.endMs / mergeTargetDropTotalDurationMs,
            1,
          ],
          outputRange: [
            0,
            0,
            (mergeTargetDropMotion.to.row - mergeTargetDropMotion.from.row) * (tileSize + gap),
            (mergeTargetDropMotion.to.row - mergeTargetDropMotion.from.row) * (tileSize + gap),
          ],
          extrapolate: 'clamp',
        })
      : null;

  return (
    <>
      {mergeAnimation && mergePlan ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: boardPadding,
            left: boardPadding,
            right: boardPadding,
            bottom: boardPadding,
            zIndex: SPECIAL_MERGE_LAYER_DEPTH.zIndex,
            elevation: SPECIAL_MERGE_LAYER_DEPTH.elevation,
          }}
        >
          {mergePlan.particles.map((particle, index) => {
            const sourceCell = mergeAnimation.board[particle.cell.row]?.[particle.cell.col];
            if (!sourceCell) {
              return null;
            }

            const distanceDelay = Math.max(0, particle.distance - 1) * SPECIAL_MERGE_WAVE_STEP;
            const preShrinkStartAt = Math.min(0.42, distanceDelay);
            const preShrinkEndAt = Math.min(0.56, preShrinkStartAt + specialMergePreShrinkEndAt);
            const mergePeakAt = Math.min(0.86, preShrinkEndAt + 0.28);
            const mergeEndAt = Math.min(1, preShrinkEndAt + 0.52);

            const translateX = mergeProgress.interpolate({
              inputRange: [0, preShrinkEndAt, mergeEndAt],
              outputRange: [0, 0, particle.deltaCol * (tileSize + gap)],
              extrapolate: 'clamp',
            });
            const translateY = mergeProgress.interpolate({
              inputRange: [0, preShrinkEndAt, mergeEndAt],
              outputRange: [0, 0, particle.deltaRow * (tileSize + gap)],
              extrapolate: 'clamp',
            });
            const scale = mergeProgress.interpolate({
              inputRange: [0, preShrinkStartAt, preShrinkEndAt, mergePeakAt, mergeEndAt],
              outputRange: [1, 1, 0.56, 0.84, 0.36],
              extrapolate: 'clamp',
            });
            const opacity = mergeProgress.interpolate({
              inputRange: [0, preShrinkStartAt, preShrinkEndAt, mergeEndAt],
              outputRange: [1, 1, 0.96, 0],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={`${mergeAnimation.key}-${index}-${particle.cell.row}-${particle.cell.col}`}
                style={{
                  position: 'absolute',
                  top: particle.cell.row * (tileSize + gap),
                  left: particle.cell.col * (tileSize + gap),
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                }}
              >
                <FruitTile
                  fruit={getCellFruit(sourceCell)}
                  size={tileSize}
                  imageScale={fruitImageScale}
                  selected={false}
                  special={
                    isSpecialCell(sourceCell)
                      ? {
                          kind: sourceCell.kind,
                          powerTier: sourceCell.powerTier,
                        }
                      : null
                  }
                  onPress={noopPress}
                />
              </Animated.View>
            );
          })}
          <Animated.View
            style={{
              position: 'absolute',
              top: mergeAnimation.targetCell.row * (tileSize + gap),
              left: mergeAnimation.targetCell.col * (tileSize + gap),
              width: tileSize,
              height: tileSize,
              opacity: mergeProgress.interpolate({
                inputRange: [0, specialMergePreShrinkEndAt, 0.42, 0.66, 1],
                outputRange: [0, 0, 0.24, 1, 0.94],
              }),
              transform: [
                ...(mergeTargetDropTranslateY ? [{ translateY: mergeTargetDropTranslateY }] : []),
                {
                  scale: mergeProgress.interpolate({
                    inputRange: [0, specialMergePreShrinkEndAt, 0.6, 0.86, 1],
                    outputRange: [0.72, 0.72, 0.72, 1.16, 1],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                width: tileSize,
                height: tileSize,
                borderRadius: tileSize / 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  width: tileSize,
                  height: tileSize,
                  borderRadius: tileSize / 2,
                  backgroundColor: 'rgba(255,255,255,0.32)',
                  opacity: mergeProgress.interpolate({
                    inputRange: [0, 0.72, 1],
                    outputRange: [0, 0, 0.64],
                  }),
                }}
              />
              {specialTargetAsset ? (
                <FruitTileImage
                  source={specialTargetAsset}
                  uri=""
                  size={Math.round(tileSize * fruitImageScale)}
                />
              ) : (
                renderSpecialMarker(mergeAnimation.special, tileSize)
              )}
            </View>
          </Animated.View>
        </View>
      ) : null}
      {wipeAnimation ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: boardPadding,
            left: boardPadding,
            right: boardPadding,
            bottom: boardPadding,
            zIndex: specialWipeLayerDepth?.zIndex ?? 17,
            elevation: specialWipeLayerDepth?.elevation ?? 17,
          }}
        >
          {isNormalSpecialWipe
            ? wipeAnimation.cells.map((cell) => {
                const pulseWindow = shiftWipeWindow(0.18, 0.34, 0.62, specialWipeOffset);
                const pulseOpacity = wipeProgress.interpolate({
                  inputRange: [0, pulseWindow.startAt, pulseWindow.peakAt, pulseWindow.endAt, 1],
                  outputRange: [0, 0.3, 0.2, 0, 0],
                });
                const pulseColor =
                  wipeAnimation.kind === 'column-wipe'
                    ? 'rgba(223,245,255,0.5)'
                    : wipeAnimation.kind === 'color-clear'
                      ? 'rgba(246,216,255,0.5)'
                      : wipeAnimation.kind === 'cross-wipe'
                        ? 'rgba(255,248,180,0.5)'
                      : 'rgba(255,242,191,0.55)';

                return (
                  <Animated.View
                    key={`${wipeAnimation.key}-${cell.row}-${cell.col}`}
                    style={{
                      position: 'absolute',
                      top: cell.row * (tileSize + gap),
                      left: cell.col * (tileSize + gap),
                      width: tileSize,
                      height: tileSize,
                      borderRadius: tileSize / 2,
                      backgroundColor: pulseColor,
                      opacity: pulseOpacity,
                    }}
                  />
                );
              })
            : null}
          {renderColorClearBursts()}
          {renderNormalSpecialWipeCellClears()}
          {renderFruityCross()}
          {renderLineRocket()}
          {renderLightningFruitsOverlay()}
        </View>
      ) : null}
    </>
  );
}
