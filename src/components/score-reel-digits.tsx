import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, type ImageSourcePropType, View } from 'react-native';

type ScoreReelDigitsProps = {
  digits: number[];
  digitHeight: number;
  digitWidth: number;
  digitGap: number;
  sprite: ImageSourcePropType;
  spriteDigits?: number;
};

export function ScoreReelDigits({
  digits,
  digitHeight,
  digitWidth,
  digitGap,
  sprite,
  spriteDigits = 10,
}: ScoreReelDigitsProps) {
  const initialDigits = useMemo(() => digits, []);
  const [fromDigits, setFromDigits] = useState(initialDigits);
  const previousDigits = useRef(initialDigits);
  const rolls = useRef(digits.map(() => new Animated.Value(1))).current;
  const digitKey = digits.join('');

  useEffect(() => {
    if (digits.length !== rolls.length) {
      previousDigits.current = digits;
      setFromDigits(digits);
      return;
    }

    const previous = previousDigits.current;
    if (previous.join('') === digitKey) {
      return;
    }

    const changedIndexes = digits
      .map((digit, index) => (digit !== previous[index] ? index : -1))
      .filter((index) => index >= 0);

    setFromDigits(previous);
    rolls.forEach((roll, index) => roll.setValue(changedIndexes.includes(index) ? 0 : 1));
    Animated.stagger(
      35,
      changedIndexes.map((index) =>
        Animated.timing(rolls[index], {
          toValue: 1,
          duration: 360 + index * 25,
          useNativeDriver: true,
        }),
      ),
    ).start(({ finished }) => {
      if (!finished) {
        return;
      }
      previousDigits.current = digits;
      setFromDigits(digits);
    });
  }, [digitKey, digits, rolls]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {digits.map((digit, index) => {
        const roll = rolls[index] ?? new Animated.Value(1);
        const translateY = roll.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -digitHeight],
        });
        const reelWidth = digitWidth + 8;
        const reelHeight = digitHeight + 8;

        return (
          <View
            key={index}
            style={{
              width: reelWidth,
              height: reelHeight,
              marginLeft: index === 0 ? 0 : digitGap,
              borderRadius: 5,
              borderWidth: 1,
              borderColor: '#6f4b12',
              backgroundColor: '#c58b2b',
              overflow: 'hidden',
              shadowColor: '#1b1004',
              shadowOpacity: 0.35,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 1,
                left: 1,
                right: 1,
                height: reelHeight * 0.42,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 236, 143, 0.65)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 2,
                right: 2,
                top: reelHeight / 2 - 1,
                height: 2,
                backgroundColor: 'rgba(74, 43, 9, 0.4)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 3,
                right: 3,
                top: 4,
                height: 2,
                backgroundColor: 'rgba(255, 255, 210, 0.55)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 4,
                top: 4,
                bottom: 4,
                width: 2,
                backgroundColor: 'rgba(255, 230, 130, 0.55)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 3,
                top: 4,
                bottom: 4,
                width: 2,
                backgroundColor: 'rgba(61, 32, 7, 0.45)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: digitWidth,
                height: digitHeight,
                overflow: 'hidden',
              }}
            >
              <Animated.View style={{ transform: [{ translateY }] }}>
                {[fromDigits[index] ?? 0, digit].map((value, valueIndex) => (
                  <View
                    key={valueIndex}
                    style={{
                      width: digitWidth,
                      height: digitHeight,
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      source={sprite}
                      fadeDuration={0}
                      resizeMode="stretch"
                      style={{
                        width: digitWidth * spriteDigits,
                        height: digitHeight,
                        transform: [{ translateX: -value * digitWidth }],
                      }}
                    />
                  </View>
                ))}
              </Animated.View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
