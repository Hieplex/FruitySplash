import { Animated, View } from 'react-native';
import { FruitTile } from '@/components/fruit-tile';
import { getCellFruit } from '@/game/board';
import type { DropMotionTiming } from '@/gameplay/drop-timing';
import type { DropAnimation, ReshuffleAnimation } from '@/components/game-board';

type DropLayerProps = {
  dropAnimation: DropAnimation;
  dropProgress: Animated.Value;
  dropMotionTimings: DropMotionTiming[];
  dropTotalDurationMs: number;
  tileSize: number;
  gap: number;
  boardPadding: number;
  fruitImageScale: number;
};

type ReshuffleLayerProps = {
  reshuffleAnimation: ReshuffleAnimation;
  reshuffleProgress: Animated.Value;
  tileSize: number;
  gap: number;
  boardPadding: number;
  fruitImageScale: number;
};

export function DropLayer({
  dropAnimation,
  dropProgress,
  dropMotionTimings,
  dropTotalDurationMs,
  tileSize,
  gap,
  boardPadding,
  fruitImageScale,
}: DropLayerProps) {
  const motions = Array.isArray(dropAnimation.motions) ? dropAnimation.motions : [];

  if (motions.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: boardPadding,
        left: boardPadding,
        right: boardPadding,
        bottom: boardPadding,
        overflow: 'hidden',
        zIndex: 12,
        elevation: 12,
      }}
    >
      {motions.map((motion, index) => {
        const distance = motion.to.row - motion.from.row;
        const timing = dropMotionTimings[index] ?? {
          startMs: 0,
          durationMs: dropTotalDurationMs,
          endMs: dropTotalDurationMs,
        };
        const totalDuration = Math.max(1, dropTotalDurationMs);
        const startProgress = timing.startMs / totalDuration;
        const endProgress = timing.endMs / totalDuration;
        const translateY = dropProgress.interpolate({
          inputRange: [0, startProgress, endProgress, 1],
          outputRange: [
            -(distance * (tileSize + gap)),
            -(distance * (tileSize + gap)),
            0,
            0,
          ],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={`${dropAnimation.key}-${index}-${motion.from.row}-${motion.from.col}-${motion.to.row}-${motion.to.col}`}
            style={{
              position: 'absolute',
              top: motion.to.row * (tileSize + gap),
              left: motion.to.col * (tileSize + gap),
              transform: [{ translateY }],
            }}
          >
            <FruitTile
              fruit={motion.fruit}
              size={tileSize}
              imageScale={fruitImageScale}
              selected={false}
              onPress={() => undefined}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

export function ReshuffleLayer({
  reshuffleAnimation,
  reshuffleProgress,
  tileSize,
  gap,
  boardPadding,
  fruitImageScale,
}: ReshuffleLayerProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: boardPadding,
        left: boardPadding,
        right: boardPadding,
        bottom: boardPadding,
        zIndex: 14,
        elevation: 14,
      }}
    >
      {reshuffleAnimation.board.map((row, rowIndex) =>
        row.map((fruit, colIndex) => (
          <Animated.View
            key={`${reshuffleAnimation.key}-${rowIndex}-${colIndex}`}
            style={{
              position: 'absolute',
              top: rowIndex * (tileSize + gap),
              left: colIndex * (tileSize + gap),
              opacity: reshuffleProgress,
              transform: [
                {
                  scale: reshuffleProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
              ],
            }}
          >
            <FruitTile
              fruit={getCellFruit(fruit)}
              size={tileSize}
              imageScale={fruitImageScale}
              selected={false}
              onPress={() => undefined}
            />
          </Animated.View>
        )),
      )}
    </View>
  );
}
