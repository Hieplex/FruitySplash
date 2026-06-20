import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, type ImageSourcePropType } from 'react-native';

const fruitSources = [
  require('../../assets/Chapter/Fruits/Apple.png'),
  require('../../assets/Chapter/Fruits/Banana.png'),
  require('../../assets/Chapter/Fruits/Blueberry.png'),
  require('../../assets/Chapter/Fruits/Cherry.png'),
  require('../../assets/Chapter/Fruits/Coconut.png'),
  require('../../assets/Chapter/Fruits/DragonFruit.png'),
  require('../../assets/Chapter/Fruits/Grapes.png'),
  require('../../assets/Chapter/Fruits/Kiwi.png'),
  require('../../assets/Chapter/Fruits/Lemon.png'),
  require('../../assets/Chapter/Fruits/Lychee.png'),
  require('../../assets/Chapter/Fruits/Mango.png'),
  require('../../assets/Chapter/Fruits/Orange.png'),
  require('../../assets/Chapter/Fruits/Peach.png'),
  require('../../assets/Chapter/Fruits/Pear.png'),
  require('../../assets/Chapter/Fruits/Pineapple.png'),
  require('../../assets/Chapter/Fruits/Strawberry.png'),
  require('../../assets/Chapter/Fruits/Watermelon.png'),
] as const satisfies ReadonlyArray<ImageSourcePropType>;

const FRUIT_TRAVEL_DURATION_MS = 9000;
const FRUIT_SCREEN_BLEED_PX = 20;
const FRUIT_HORIZONTAL_DRIFT_PX = 34;
const FRUIT_TOP_ENTRY_PX = 120;
const FRUIT_BOTTOM_EXIT_PX = 140;

type FruitRainProps = {
  width: number;
  height: number;
};

type FruitRainDrop = {
  delayMs: number;
  endX: number;
  endY: number;
  rotate: string;
  size: number;
  source: ImageSourcePropType;
  startX: number;
  startY: number;
};

export function ChapterFruitRain({ width, height }: FruitRainProps) {
  const bleedWidth = width + FRUIT_SCREEN_BLEED_PX * 2;
  const bleedHeight = height + FRUIT_SCREEN_BLEED_PX * 2;
  const horizontalDrift = Math.max(width * 0.035, FRUIT_HORIZONTAL_DRIFT_PX);
  const topEntry = Math.max(height * 0.08, FRUIT_TOP_ENTRY_PX);
  const bottomExit = Math.max(height * 0.1, FRUIT_BOTTOM_EXIT_PX);

  function projectX(ratio: number) {
    return bleedWidth * ratio - FRUIT_SCREEN_BLEED_PX;
  }

  function projectY(ratio: number) {
    return bleedHeight * ratio - FRUIT_SCREEN_BLEED_PX;
  }

  function getTravelPadding(size: number) {
    return Math.ceil(size * 1.5);
  }

  const drops = useMemo<FruitRainDrop[]>(
    () => [
      { source: fruitSources[12], startX: projectX(0.18), startY: projectY(-0.28), endX: projectX(0.12), endY: projectY(1.06), size: 56, delayMs: 600, rotate: '-13deg' },
      { source: fruitSources[13], startX: projectX(0.3), startY: projectY(-0.34), endX: projectX(0.26), endY: projectY(1.02), size: 54, delayMs: 1700, rotate: '9deg' },
      { source: fruitSources[14], startX: projectX(0.44), startY: projectY(-0.26), endX: projectX(0.39), endY: projectY(1.08), size: 50, delayMs: 2900, rotate: '-7deg' },
      { source: fruitSources[0], startX: projectX(0.58), startY: projectY(-0.22), endX: projectX(0.54), endY: projectY(1.04), size: 58, delayMs: 0, rotate: '-12deg' },
      { source: fruitSources[1], startX: projectX(0.72), startY: projectY(-0.18), endX: projectX(0.69), endY: projectY(1.02), size: 58, delayMs: 1400, rotate: '10deg' },
      { source: fruitSources[2], startX: projectX(0.84), startY: projectY(-0.3), endX: projectX(0.8), endY: projectY(1.06), size: 54, delayMs: 900, rotate: '-8deg' },
      { source: fruitSources[3], startX: projectX(0.94), startY: projectY(-0.24), endX: projectX(0.9), endY: projectY(1.03), size: 52, delayMs: 2600, rotate: '14deg' },
      { source: fruitSources[4], startX: projectX(0.14), startY: projectY(-0.06), endX: projectX(0.1), endY: projectY(1.14), size: 62, delayMs: 2200, rotate: '-16deg' },
      { source: fruitSources[5], startX: projectX(0.34), startY: projectY(-0.02), endX: projectX(0.3), endY: projectY(1.12), size: 50, delayMs: 3200, rotate: '12deg' },
      { source: fruitSources[6], startX: projectX(0.5), startY: projectY(0.04), endX: projectX(0.46), endY: projectY(1.1), size: 56, delayMs: 1800, rotate: '-10deg' },
      { source: fruitSources[7], startX: projectX(0.66), startY: projectY(0.02), endX: projectX(0.62), endY: projectY(1.16), size: 56, delayMs: 4200, rotate: '16deg' },
      { source: fruitSources[8], startX: projectX(0.82), startY: projectY(0.08), endX: projectX(0.78), endY: projectY(1.18), size: 56, delayMs: 1200, rotate: '-14deg' },
      { source: fruitSources[9], startX: projectX(0.24), startY: projectY(0.18), endX: projectX(0.2), endY: projectY(1.22), size: 58, delayMs: 3600, rotate: '8deg' },
      { source: fruitSources[10], startX: projectX(0.56), startY: projectY(0.22), endX: projectX(0.51), endY: projectY(1.2), size: 70, delayMs: 500, rotate: '-11deg' },
      { source: fruitSources[11], startX: projectX(0.9), startY: projectY(0.28), endX: projectX(0.86), endY: projectY(1.24), size: 52, delayMs: 2800, rotate: '10deg' },
    ],
    [bleedHeight, bleedWidth],
  );

  const progressValuesRef = useRef<Animated.Value[]>([]);
  if (progressValuesRef.current.length !== drops.length) {
    progressValuesRef.current = drops.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    let cancelled = false;
    const activeAnimations = new Map<number, Animated.CompositeAnimation>();

    const startDrop = (index: number) => {
      if (cancelled) {
        return;
      }

      const value = progressValuesRef.current[index];
      value.setValue(0);
      const animation = Animated.sequence([
        Animated.delay(drops[index].delayMs),
        Animated.timing(value, {
          toValue: 1,
          duration: FRUIT_TRAVEL_DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]);

      activeAnimations.set(index, animation);
      animation.start(({ finished }) => {
        if (!finished || cancelled) {
          return;
        }

        startDrop(index);
      });
    };

    drops.forEach((_, index) => {
      startDrop(index);
    });

    return () => {
      cancelled = true;
      activeAnimations.forEach((animation) => animation.stop());
    };
  }, [drops]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {drops.map((drop, index) => {
        const progress = progressValuesRef.current[index];
        const travelPadding = getTravelPadding(drop.size);
        const entryX = drop.startX + horizontalDrift;
        const entryY = drop.startY - topEntry - FRUIT_SCREEN_BLEED_PX - travelPadding;
        const exitX = drop.endX - horizontalDrift;
        const exitY = drop.endY + bottomExit + FRUIT_SCREEN_BLEED_PX + travelPadding;

        return (
          <Animated.Image
            key={`${drop.startX}-${drop.startY}-${index}`}
            source={drop.source}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              width: drop.size,
              height: drop.size,
              opacity: 0.94,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [entryX, exitX],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [entryY, exitY],
                  }),
                },
                { rotate: drop.rotate },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
