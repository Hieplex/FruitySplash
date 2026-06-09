import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View, type ImageSourcePropType } from 'react-native';
import { isBombEffectCell, type BombDropAnimation } from '@/components/bomb-effect-cell';
import { FruitTile } from '@/components/fruit-tile';
import { getCellFruit } from '@/game/board';
import { vfxRuntimeAssets } from '@/game/assets/runtime-assets';
import type { Board } from '@/game/types';

type BombEffectLayerProps = {
  board: Board;
  animation: BombDropAnimation;
  source?: ImageSourcePropType;
  tileSize: number;
  gap: number;
  boardPadding: number;
  fruitImageScale: number;
  onComplete?: (key: number) => void;
};

const BOMB_DROP_DURATION_MS = 430;
const BOMB_IMPACT_DURATION_MS = 680;
const BOMB_SHOCKWAVE_DURATION_MS = 620;
const BOMB_SHOCKWAVE_LEAD_MS = 120;
const BOMB_POP_DURATION_MS = 420;
const BOMB_SHAKE_DISTANCE = 7;
const BOMB_LAND_OFFSET_Y = -5;
const BOMB_SHOCKWAVE_SIZE_MULTIPLIER = 3.2;

export function BombEffectLayer({
  board,
  animation,
  source,
  tileSize,
  gap,
  boardPadding,
  fruitImageScale,
  onComplete,
}: BombEffectLayerProps) {
  const bombDropProgress = useRef(new Animated.Value(1)).current;
  const bombImpactProgress = useRef(new Animated.Value(1)).current;
  const bombShockwaveProgress = useRef(new Animated.Value(1)).current;
  const bombPopProgress = useRef(new Animated.Value(1)).current;
  const animatedBombDropKey = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [bombPopActive, setBombPopActive] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    if (animatedBombDropKey.current === animation.key) {
      return;
    }

    animatedBombDropKey.current = animation.key;
    bombDropProgress.setValue(0);
    bombImpactProgress.setValue(0);
    bombShockwaveProgress.setValue(0);
    bombPopProgress.setValue(0);
    setBombPopActive(false);

    const popStartTimeout = setTimeout(() => {
      setBombPopActive(true);
    }, BOMB_DROP_DURATION_MS + BOMB_IMPACT_DURATION_MS - BOMB_SHOCKWAVE_LEAD_MS + BOMB_SHOCKWAVE_DURATION_MS);
    const impactAnimation = Animated.timing(bombImpactProgress, {
      toValue: 1,
      duration: BOMB_IMPACT_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const shockwaveAnimation = Animated.timing(bombShockwaveProgress, {
      toValue: 1,
      duration: BOMB_SHOCKWAVE_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const popAnimation = Animated.timing(bombPopProgress, {
      toValue: 1,
      duration: BOMB_POP_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const animationSequence = Animated.sequence([
      Animated.timing(bombDropProgress, {
        toValue: 1,
        duration: BOMB_DROP_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.parallel([
        impactAnimation,
        Animated.sequence([Animated.delay(BOMB_IMPACT_DURATION_MS - BOMB_SHOCKWAVE_LEAD_MS), shockwaveAnimation]),
      ]),
      popAnimation,
    ]);

    animationSequence.start(({ finished }) => {
      if (finished) {
        onCompleteRef.current?.(animation.key);
      }
    });

    return () => {
      clearTimeout(popStartTimeout);
      animationSequence.stop();
    };
  }, [animation, bombDropProgress, bombImpactProgress, bombPopProgress, bombShockwaveProgress]);

  const bombShockwaveScale = bombShockwaveProgress.interpolate({
    inputRange: [0, 0.16, 0.72, 1],
    outputRange: [0.3, 0.72, BOMB_SHOCKWAVE_SIZE_MULTIPLIER, BOMB_SHOCKWAVE_SIZE_MULTIPLIER + 0.2],
  });
  const bombShockwaveOpacity = bombShockwaveProgress.interpolate({
    inputRange: [0, 0.12, 0.68, 1],
    outputRange: [0, 1, 1, 0],
  });
  const bombPopScaleX = bombPopProgress.interpolate({
    inputRange: [0, 0.18, 0.32, 0.5, 1],
    outputRange: [1, 1.28, 0.88, 1.18, 1.34],
  });
  const bombPopScaleY = bombPopProgress.interpolate({
    inputRange: [0, 0.18, 0.32, 0.5, 1],
    outputRange: [1, 0.86, 1.26, 1.08, 1.28],
  });
  const bombPopLift = bombPopProgress.interpolate({
    inputRange: [0, 0.2, 0.42, 0.68, 1],
    outputRange: [0, -8, 4, -3, 0],
  });
  const bombPopRotate = bombPopProgress.interpolate({
    inputRange: [0, 0.22, 0.48, 1],
    outputRange: ['0deg', '-6deg', '5deg', '0deg'],
  });
  const bombPopOpacity = bombPopProgress.interpolate({
    inputRange: [0, 0.62, 0.76, 1],
    outputRange: [1, 1, 0.28, 0],
  });
  const shockwavePosition = useMemo(() => {
    const ringSize = Math.round(tileSize * 1.2);

    return {
      size: ringSize,
      x: animation.target.col * (tileSize + gap) + tileSize / 2 - ringSize / 2,
      y: animation.target.row * (tileSize + gap) + tileSize / 2 - ringSize / 2,
    };
  }, [animation.target.col, animation.target.row, gap, tileSize]);
  const bombPosition = useMemo(() => {
    const size = Math.round(tileSize * 2.04);

    return {
      size,
      x: animation.target.col * (tileSize + gap) + tileSize / 2 - size / 2,
      y: animation.target.row * (tileSize + gap) + tileSize / 2 - size / 2 + BOMB_LAND_OFFSET_Y,
    };
  }, [animation.target.col, animation.target.row, gap, tileSize]);
  const bombTranslateY = bombDropProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-boardPadding - bombPosition.size - 120 - bombPosition.y, 0],
  });
  const bombRotate = bombDropProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18deg', '0deg'],
  });
  const bombScale = bombImpactProgress.interpolate({
    inputRange: [0, 0.18, 0.7, 1],
    outputRange: [1, 1.2, 1.2, 0.03],
  });
  const bombImpactShakeX = bombImpactProgress.interpolate({
    inputRange: [0, 0.18, 0.3, 0.42, 0.56, 0.72, 1],
    outputRange: [0, 0, -7, 7, -5, 3, 0],
  });
  const bombImpactRotate = bombImpactProgress.interpolate({
    inputRange: [0, 0.18, 0.34, 0.5, 0.68, 1],
    outputRange: ['0deg', '0deg', '-5deg', '4deg', '-2deg', '0deg'],
  });
  const bombOpacity = bombImpactProgress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });

  const getBombShakeTransform = (rowIndex: number, colIndex: number) => {
    const direction = (rowIndex + colIndex) % 2 === 0 ? 1 : -1;
    const translateX = bombShockwaveProgress.interpolate({
      inputRange: [0, 0.12, 0.24, 0.38, 0.52, 0.68, 0.84, 1],
      outputRange: [
        0,
        BOMB_SHAKE_DISTANCE * direction,
        -BOMB_SHAKE_DISTANCE * 0.85 * direction,
        BOMB_SHAKE_DISTANCE * 0.68 * direction,
        -BOMB_SHAKE_DISTANCE * 0.48 * direction,
        BOMB_SHAKE_DISTANCE * 0.32 * direction,
        -BOMB_SHAKE_DISTANCE * 0.18 * direction,
        0,
      ],
    });
    const scale = bombShockwaveProgress.interpolate({
      inputRange: [0, 0.12, 0.3, 0.52, 0.75, 1],
      outputRange: [1, 1.07, 0.98, 1.035, 0.995, 1],
    });

    return [{ translateX }, { translateY: 0 }, { scale }];
  };

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: boardPadding,
          left: boardPadding,
          right: boardPadding,
          bottom: boardPadding,
          zIndex: 18,
          elevation: 18,
        }}
      >
        {board.flatMap((row, rowIndex) =>
          row.map((fruit, colIndex) => {
            if (!isBombEffectCell(animation, rowIndex, colIndex)) {
              return null;
            }

            return (
              <Animated.View
                key={`${animation.key}-cell-${rowIndex}-${colIndex}`}
                style={{
                  position: 'absolute',
                  top: rowIndex * (tileSize + gap),
                  left: colIndex * (tileSize + gap),
                  opacity: bombPopActive ? bombPopOpacity : 1,
                  transform: bombPopActive
                    ? [
                        { translateY: bombPopLift },
                        { rotate: bombPopRotate },
                        { scaleX: bombPopScaleX },
                        { scaleY: bombPopScaleY },
                      ]
                    : getBombShakeTransform(rowIndex, colIndex),
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
            );
          }),
        )}
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: boardPadding,
          left: boardPadding,
          right: boardPadding,
          bottom: boardPadding,
          zIndex: 24,
          elevation: 24,
        }}
      >
        <Animated.Image
          source={vfxRuntimeAssets.bombShockwave}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: shockwavePosition.y,
            left: shockwavePosition.x,
            width: shockwavePosition.size,
            height: shockwavePosition.size,
            opacity: bombShockwaveOpacity,
            transform: [{ scale: bombShockwaveScale }],
          }}
        />
      </View>
      {source ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: boardPadding,
            left: boardPadding,
            right: boardPadding,
            bottom: boardPadding,
            zIndex: 30,
            elevation: 30,
          }}
        >
          <Animated.Image
            source={source}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              top: bombPosition.y,
              left: bombPosition.x,
              width: bombPosition.size,
              height: bombPosition.size,
              opacity: bombOpacity,
              transform: [
                { translateX: bombImpactShakeX },
                { translateY: bombTranslateY },
                { rotate: bombRotate },
                { rotate: bombImpactRotate },
                { scale: bombScale },
              ],
            }}
          />
        </View>
      ) : null}
    </>
  );
}
