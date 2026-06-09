import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import type { Board, BoardCell, DropMotion, Position } from '@/game/types';
import type { RecommendedMove } from '@/game/move-hints';
import { isBombEffectCell, type BombDropAnimation } from '@/components/bomb-effect-cell';
import { BombEffectLayer } from '@/components/bomb-effect-layer';
import { isHammerEffectCell, type HammerAnimation } from '@/components/hammer-effect-cell';
import { HammerEffectLayer } from '@/components/hammer-effect-layer';
import { FruitTile } from '@/components/fruit-tile';
import { DropLayer, ReshuffleLayer } from '@/components/game-board-layers';
import { MatchSplashOverlay, type MatchSplash } from '@/components/match-splash-overlay';
import { MoveHintOverlay } from '@/components/move-hint-overlay';
import {
  SpecialCellLayer,
  type SpecialMergeAnimation,
  type SpecialWipeAnimation,
} from '@/components/special-cell-layer';
import { getCellFruit, isSpecialCell } from '@/game/board';
import { buildDropMotionTimings } from '@/gameplay/drop-timing';
import { getBoardCellFromPoint, getSwipeTarget, getSwipeTargetFromReleaseCell } from '@/gameplay/swipe';
import { spacing } from '@/theme/spacing';

type PendingSwap = {
  key: number;
  from: Position;
  to: Position;
  fromCell: BoardCell;
  toCell: BoardCell;
  accepted: boolean;
};

export type DropAnimation = {
  key: number;
  motions: DropMotion[] | null;
  hiddenCells?: Position[];
  startDelaysByColumn?: Record<number, number>;
};

export type ReshuffleAnimation = {
  key: number;
  board: Board;
};

const RESHUFFLE_DURATION_MS = 360;

export function GameBoard({
  board,
  selected,
  disabled = false,
  pendingSwap,
  matchSplash,
  dropAnimation,
  bombDropAnimation,
  reshuffleAnimation,
  specialMergeAnimation,
  specialWipeAnimation,
  bombDropSource,
  hammerAnimation,
  hammerSource,
  hint,
  maxWidth = 380,
  horizontalMargin = spacing.lg,
  tileGap = spacing.sm,
  boardPadding = spacing.sm,
  fruitImageScale = 1.28,
  showTouchBounds = false,
  onSelect,
  onSwipe,
  onSwapAnimationEnd,
  onMatchSplashComplete,
  onDropAnimationComplete,
  onBombDropAnimationComplete,
  onHammerAnimationComplete,
  onReshuffleAnimationComplete,
  onSpecialMergeComplete,
  onSpecialWipeComplete,
}: {
  board: Board;
  selected: Position | null;
  disabled?: boolean;
  pendingSwap?: PendingSwap | null;
  matchSplash?: MatchSplash | null;
  dropAnimation?: DropAnimation | null;
  bombDropAnimation?: BombDropAnimation | null;
  reshuffleAnimation?: ReshuffleAnimation | null;
  specialMergeAnimation?: SpecialMergeAnimation | null;
  specialWipeAnimation?: SpecialWipeAnimation | null;
  bombDropSource?: ImageSourcePropType;
  hammerAnimation?: HammerAnimation | null;
  hammerSource?: ImageSourcePropType;
  hint?: RecommendedMove | null;
  maxWidth?: number;
  horizontalMargin?: number;
  tileGap?: number;
  boardPadding?: number;
  fruitImageScale?: number;
  showTouchBounds?: boolean;
  onSelect: (position: Position) => void;
  onSwipe?: (from: Position, to: Position) => void;
  onSwapAnimationEnd?: () => void;
  onMatchSplashComplete?: (key: number) => void;
  onDropAnimationComplete?: (key: number) => void;
  onBombDropAnimationComplete?: (key: number) => void;
  onHammerAnimationComplete?: (key: number) => void;
  onReshuffleAnimationComplete?: (key: number) => void;
  onSpecialMergeComplete?: (key: number) => void;
  onSpecialWipeComplete?: (key: number) => void;
}) {
  const { width } = useWindowDimensions();
  const rowCount = board.length;
  const colCount = board[0]?.length ?? 1;
  const gap = tileGap;
  const tileSize = useMemo(() => {
    const boardWidth = Math.min(width - horizontalMargin * 2, maxWidth);
    return Math.floor((boardWidth - gap * (colCount - 1)) / colCount);
  }, [colCount, gap, horizontalMargin, maxWidth, width]);
  const fromTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const toTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dropProgress = useMemo(() => new Animated.Value(0), [dropAnimation?.key]);
  const reshuffleProgress = useMemo(() => new Animated.Value(0), [reshuffleAnimation?.key]);
  const animatedSwapKey = useRef<number | null>(null);
  const animatedDropKey = useRef<number | null>(null);
  const animatedReshuffleKey = useRef<number | null>(null);
  const gestureStartCell = useRef<Position | null>(null);
  const onSwapAnimationEndRef = useRef(onSwapAnimationEnd);
  const onDropAnimationCompleteRef = useRef(onDropAnimationComplete);
  const onReshuffleAnimationCompleteRef = useRef(onReshuffleAnimationComplete);
  const boardPixelWidth = colCount * tileSize + gap * (colCount - 1);
  const boardPixelHeight = rowCount * tileSize + gap * (rowCount - 1);
  const splashHiddenCells = useMemo(() => {
    if (!matchSplash) {
      return new Set<string>();
    }

    return new Set(matchSplash.cells.map((cell) => `${cell.row}:${cell.col}`));
  }, [matchSplash]);
  const dropMotions = useMemo(() => (Array.isArray(dropAnimation?.motions) ? dropAnimation.motions : []), [dropAnimation]);
  const dropHiddenCells = useMemo(() => {
    const hidden = new Set<string>();

    dropAnimation?.hiddenCells?.forEach((cell) => {
      hidden.add(`${cell.row}:${cell.col}`);
    });

    if (dropMotions.length === 0) {
      return hidden;
    }

    dropMotions.forEach((motion) => {
      hidden.add(`${motion.to.row}:${motion.to.col}`);
      if (motion.from.row >= 0) {
        hidden.add(`${motion.from.row}:${motion.from.col}`);
      }
    });

    return hidden;
  }, [dropAnimation, dropMotions]);
  const dropTimingSchedule = useMemo(
    () =>
      buildDropMotionTimings(dropMotions, {
        startDelaysByColumn: dropAnimation?.startDelaysByColumn,
      }),
    [dropAnimation?.startDelaysByColumn, dropMotions],
  );
  const bombClearedCells = useMemo(() => {
    if (!bombDropAnimation?.blastCells) {
      return new Set<string>();
    }

    return new Set(bombDropAnimation.blastCells.map((cell) => `${cell.row}:${cell.col}`));
  }, [bombDropAnimation]);
  const specialMergeHiddenCells = useMemo(() => {
    if (!specialMergeAnimation) {
      return new Set<string>();
    }

    return new Set(
      [...specialMergeAnimation.sourceCells, ...(specialMergeAnimation.hiddenCells ?? [])].map(
        (cell) => `${cell.row}:${cell.col}`,
      ),
    );
  }, [specialMergeAnimation]);
  const fruityCrossHiddenCells = useMemo(() => {
    if (specialWipeAnimation?.sourceTool !== 'fruityCross') {
      return new Set<string>();
    }

    return new Set(specialWipeAnimation.cells.map((cell) => `${cell.row}:${cell.col}`));
  }, [specialWipeAnimation]);

  useEffect(() => {
    onSwapAnimationEndRef.current = onSwapAnimationEnd;
  }, [onSwapAnimationEnd]);

  useEffect(() => {
    onDropAnimationCompleteRef.current = onDropAnimationComplete;
  }, [onDropAnimationComplete]);

  useEffect(() => {
    onReshuffleAnimationCompleteRef.current = onReshuffleAnimationComplete;
  }, [onReshuffleAnimationComplete]);


  useLayoutEffect(() => {
    if (!pendingSwap) {
      fromTranslate.setValue({ x: 0, y: 0 });
      toTranslate.setValue({ x: 0, y: 0 });
      animatedSwapKey.current = null;
      return;
    }
    if (animatedSwapKey.current === pendingSwap.key) {
      return;
    }

    animatedSwapKey.current = pendingSwap.key;

    const dx = (pendingSwap.to.col - pendingSwap.from.col) * (tileSize + gap);
    const dy = (pendingSwap.to.row - pendingSwap.from.row) * (tileSize + gap);

    fromTranslate.setValue({ x: 0, y: 0 });
    toTranslate.setValue({ x: 0, y: 0 });

    const goOut = Animated.parallel([
      Animated.timing(fromTranslate, {
        toValue: { x: dx, y: dy },
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(toTranslate, {
        toValue: { x: -dx, y: -dy },
        duration: 130,
        useNativeDriver: true,
      }),
    ]);

    const goBack = Animated.parallel([
      Animated.timing(fromTranslate, {
        toValue: { x: 0, y: 0 },
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(toTranslate, {
        toValue: { x: 0, y: 0 },
        duration: 110,
        useNativeDriver: true,
      }),
    ]);

    const sequence = pendingSwap.accepted ? goOut : Animated.sequence([goOut, goBack]);
    sequence.start(() => {
      if (!pendingSwap.accepted) {
        fromTranslate.setValue({ x: 0, y: 0 });
        toTranslate.setValue({ x: 0, y: 0 });
      }
      onSwapAnimationEndRef.current?.();
    });

    return () => sequence.stop();
  }, [fromTranslate, gap, pendingSwap, tileSize, toTranslate]);

  useLayoutEffect(() => {
    if (!dropAnimation || dropMotions.length === 0) {
      dropProgress.setValue(0);
      animatedDropKey.current = null;
      return;
    }
    if (animatedDropKey.current === dropAnimation.key) {
      return;
    }

    animatedDropKey.current = dropAnimation.key;
    dropProgress.setValue(0);
    const animation = Animated.timing(dropProgress, {
      toValue: 1,
      duration: dropTimingSchedule.totalDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onDropAnimationCompleteRef.current?.(dropAnimation.key);
      }
    });

    return () => animation.stop();
  }, [dropAnimation, dropMotions, dropProgress, dropTimingSchedule.totalDurationMs]);

  useLayoutEffect(() => {
    if (!reshuffleAnimation) {
      reshuffleProgress.setValue(0);
      animatedReshuffleKey.current = null;
      return;
    }
    if (animatedReshuffleKey.current === reshuffleAnimation.key) {
      return;
    }

    animatedReshuffleKey.current = reshuffleAnimation.key;
    reshuffleProgress.setValue(0);
    const animation = Animated.timing(reshuffleProgress, {
      toValue: 1,
      duration: RESHUFFLE_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onReshuffleAnimationCompleteRef.current?.(reshuffleAnimation.key);
      }
    });

    return () => animation.stop();
  }, [reshuffleAnimation, reshuffleProgress]);

  const hiddenCell = (rowIndex: number, colIndex: number) => {
    if (splashHiddenCells.has(`${rowIndex}:${colIndex}`)) {
      return true;
    }
    if (dropHiddenCells.has(`${rowIndex}:${colIndex}`)) {
      return true;
    }
    if (dropAnimation && bombClearedCells.has(`${rowIndex}:${colIndex}`)) {
      return true;
    }
    if (specialMergeHiddenCells.has(`${rowIndex}:${colIndex}`)) {
      return true;
    }
    if (fruityCrossHiddenCells.has(`${rowIndex}:${colIndex}`)) {
      return true;
    }

    return (
      (pendingSwap &&
        ((pendingSwap.from.row === rowIndex && pendingSwap.from.col === colIndex) ||
          (pendingSwap.to.row === rowIndex && pendingSwap.to.col === colIndex))) ||
      isHammerEffectCell(hammerAnimation, rowIndex, colIndex)
    );
  };

  const touchMetrics = useMemo(
    () => ({
      rows: rowCount,
      cols: colCount,
      tileSize,
      gap,
      boardPadding,
    }),
    [boardPadding, colCount, gap, rowCount, tileSize],
  );
  const getCellFromLocalPoint = useCallback(
    (x: number, y: number) => getBoardCellFromPoint({ x, y }, touchMetrics),
    [touchMetrics],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          gestureStartCell.current = getCellFromLocalPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderRelease: (event, gesture) => {
          const origin = gestureStartCell.current;
          gestureStartCell.current = null;

          if (!origin) {
            return;
          }

          const releaseCell = getCellFromLocalPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          const target =
            getSwipeTargetFromReleaseCell(origin, releaseCell, board) ??
            getSwipeTarget(origin, { dx: gesture.dx, dy: gesture.dy }, board);
          if (target) {
            onSwipe?.(origin, target);
            return;
          }

          onSelect(origin);
        },
        onPanResponderTerminate: () => {
          gestureStartCell.current = null;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [board, disabled, getCellFromLocalPoint, onSelect, onSwipe],
  );

  return (
    <View
      style={{
        alignSelf: 'center',
        backgroundColor: 'transparent',
        padding: boardPadding,
        borderRadius: spacing.radiusLg,
        width: boardPixelWidth + boardPadding * 2,
        height: boardPixelHeight + boardPadding * 2,
        gap,
        borderWidth: 0,
        borderColor: 'transparent',
      }}
    >
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap }}>
          {row.map((fruit, colIndex) => {
            const isBombCell = isBombEffectCell(bombDropAnimation, rowIndex, colIndex);
            const isHammerCell = isHammerEffectCell(hammerAnimation, rowIndex, colIndex);

            return (
              <Animated.View
                key={`${rowIndex}-${colIndex}`}
                style={{
                  opacity: hiddenCell(rowIndex, colIndex) || isBombCell || isHammerCell ? 0 : 1,
                  transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
                }}
              >
                <FruitTile
                  fruit={getCellFruit(fruit)}
                  size={tileSize}
                  imageScale={fruitImageScale}
                  selected={selected?.row === rowIndex && selected?.col === colIndex}
                  special={
                    isSpecialCell(fruit)
                      ? {
                          kind: fruit.kind,
                          powerTier: fruit.powerTier,
                        }
                      : null
                  }
                  disabled
                  onPress={() => {
                    if (disabled) return;
                    onSelect({ row: rowIndex, col: colIndex });
                  }}
                />
              </Animated.View>
            );
          })}
        </View>
      ))}
      {pendingSwap ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: boardPadding,
            left: boardPadding,
            right: boardPadding,
            bottom: boardPadding,
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: pendingSwap.from.row * (tileSize + gap),
              left: pendingSwap.from.col * (tileSize + gap),
              transform: fromTranslate.getTranslateTransform(),
            }}
          >
            <FruitTile
              fruit={getCellFruit(pendingSwap.fromCell)}
              size={tileSize}
              imageScale={fruitImageScale}
              selected
              special={
                isSpecialCell(pendingSwap.fromCell)
                  ? {
                      kind: pendingSwap.fromCell.kind,
                      powerTier: pendingSwap.fromCell.powerTier,
                    }
                  : null
              }
              onPress={() => undefined}
            />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute',
              top: pendingSwap.to.row * (tileSize + gap),
              left: pendingSwap.to.col * (tileSize + gap),
              transform: toTranslate.getTranslateTransform(),
            }}
          >
            <FruitTile
              fruit={getCellFruit(pendingSwap.toCell)}
              size={tileSize}
              imageScale={fruitImageScale}
              selected
              special={
                isSpecialCell(pendingSwap.toCell)
                  ? {
                      kind: pendingSwap.toCell.kind,
                      powerTier: pendingSwap.toCell.powerTier,
                    }
                  : null
              }
              onPress={() => undefined}
            />
          </Animated.View>
        </View>
      ) : null}
      {dropAnimation && dropMotions.length > 0 ? (
        <DropLayer
          dropAnimation={dropAnimation}
          dropProgress={dropProgress}
          dropMotionTimings={dropTimingSchedule.timings}
          dropTotalDurationMs={dropTimingSchedule.totalDurationMs}
          tileSize={tileSize}
          gap={gap}
          boardPadding={boardPadding}
          fruitImageScale={fruitImageScale}
        />
      ) : null}
      {reshuffleAnimation ? (
        <ReshuffleLayer
          reshuffleAnimation={reshuffleAnimation}
          reshuffleProgress={reshuffleProgress}
          tileSize={tileSize}
          gap={gap}
          boardPadding={boardPadding}
          fruitImageScale={fruitImageScale}
        />
      ) : null}
      {specialMergeAnimation || specialWipeAnimation ? (
        <SpecialCellLayer
          mergeAnimation={specialMergeAnimation}
          wipeAnimation={specialWipeAnimation}
          tileSize={tileSize}
          gap={gap}
          boardPadding={boardPadding}
          fruitImageScale={fruitImageScale}
          onMergeComplete={onSpecialMergeComplete}
          onWipeComplete={onSpecialWipeComplete}
        />
      ) : null}
      {bombDropAnimation ? (
        <BombEffectLayer
          board={board}
          animation={bombDropAnimation}
          source={bombDropSource}
          tileSize={tileSize}
          gap={gap}
          boardPadding={boardPadding}
          fruitImageScale={fruitImageScale}
          onComplete={onBombDropAnimationComplete}
        />
      ) : null}
      {hammerAnimation && hammerSource ? (
        <HammerEffectLayer
          board={board}
          animation={hammerAnimation}
          source={hammerSource}
          tileSize={tileSize}
          gap={gap}
          boardPadding={boardPadding}
          fruitImageScale={fruitImageScale}
          onComplete={onHammerAnimationComplete}
        />
      ) : null}
      <MoveHintOverlay hint={hint ?? null} tileSize={tileSize} gap={gap} boardPadding={boardPadding} />
      <MatchSplashOverlay
        key={matchSplash?.key ?? 'empty-match-splash'}
        splash={matchSplash ?? null}
        tileSize={tileSize}
        fruitImageScale={fruitImageScale}
        gap={gap}
        boardPadding={boardPadding}
        onComplete={onMatchSplashComplete}
      />
      <View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: boardPixelWidth + boardPadding * 2,
          height: boardPixelHeight + boardPadding * 2,
          zIndex: 45,
          elevation: 45,
          backgroundColor: 'transparent',
        }}
      />
      {showTouchBounds ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: boardPadding,
            left: boardPadding,
            right: boardPadding,
            bottom: boardPadding,
            zIndex: 40,
            elevation: 40,
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((_, colIndex) => (
              <View
                key={`touch-bounds-${rowIndex}-${colIndex}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: rowIndex * (tileSize + gap),
                  left: colIndex * (tileSize + gap),
                  width: tileSize,
                  height: tileSize,
                  borderRadius: Math.max(4, Math.round(tileSize * 0.08)),
                  borderWidth: 2,
                  borderColor: 'rgba(0, 255, 255, 0.9)',
                  backgroundColor: 'rgba(0, 255, 255, 0.08)',
                }}
              />
            )),
          )}
        </View>
      ) : null}
    </View>
  );
}
