import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native';
import {
  backgroundRuntimeAssets,
  coinRuntimeAssets,
  uiRuntimeAssets,
} from '@/game/assets/runtime-assets';
import { FIRST_CLEAR_COIN_REWARD } from '@/state/progress-helpers';
import { useScreenWipe } from '@/state/screen-wipe';
import { spacing } from '@/theme/spacing';

const AnimatedView = Animated.View;

const STAR_SIZE = 130;
const STAR_TOP = '11%';
const STAR_ROW_OFFSET_X = 2;
const STAR_OVERLAP_X = -10;
const FINISH_STAR_OFFSET_X = 0;
const FINISH_STAR_OFFSET_Y = 0;
const FINISH_STAR_SCALE = 0.8;
const REWARD_COIN_TOP = '45%';
const REWARD_COIN_SIZE = 90;
const REWARD_TEXT_TOP = '70%';
const REWARD_NUMBER_FONT_SIZE = 30;
const REWARD_NUMBER_LINE_HEIGHT = 40;
const REWARD_NUMBER_OUTLINE_OFFSET = 3;
const REWARD_NUMBER_COLOR = '#FFFFFF';
const REWARD_NUMBER_OUTLINE_COLOR = '#080304';
const REWARD_NUMBER_TEXT_WEIGHT = '900' as const;
const REWARD_COUNT_DELAY_MS = 780;
const REWARD_COUNT_DURATION_MS = 900;
const CONTINUE_BUTTON_TOP = '70%';
const CONTINUE_BUTTON_WIDTH = '50%';
const CONTINUE_BUTTON_ASPECT_RATIO = 1536 / 1024;
const REWARD_NUMBER_OUTLINE_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

function AnimatedFillStar({
  filled,
  delayMs,
}: {
  filled: boolean;
  delayMs: number;
}) {
  const fillProgress = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!filled) {
      fillProgress.setValue(0);
      popScale.setValue(1);
      return;
    }

    fillProgress.setValue(0);
    popScale.setValue(0.88);

    const fillAnimation = Animated.timing(fillProgress, {
      toValue: 1,
      duration: 900,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    const popAnimation = Animated.sequence([
      Animated.delay(delayMs + 140),
      Animated.spring(popScale, {
        toValue: 1.08,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(popScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]);

    fillAnimation.start();
    popAnimation.start();
  }, [delayMs, fillProgress, filled, popScale]);

  return (
    <AnimatedView
      style={{
        width: STAR_SIZE,
        height: STAR_SIZE,
        marginHorizontal: STAR_OVERLAP_X,
        transform: [{ scale: popScale }],
      }}
    >
      <Image
        source={uiRuntimeAssets.unfinishStar}
        resizeMode="contain"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {filled ? (
        <AnimatedView
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: fillProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, STAR_SIZE],
            }),
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: STAR_SIZE,
            }}
          >
            <Image
              source={uiRuntimeAssets.finishStar}
              resizeMode="contain"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                transform: [
                  { translateX: FINISH_STAR_OFFSET_X },
                  { translateY: FINISH_STAR_OFFSET_Y },
                  { scale: FINISH_STAR_SCALE },
                ],
              }}
            />
          </View>
        </AnimatedView>
      ) : null}
    </AnimatedView>
  );
}

function RewardNumberText({ value }: { value: number }) {
  const rewardText = String(Math.max(0, Math.floor(value)));
  const baseTextStyle = {
    color: REWARD_NUMBER_COLOR,
    fontSize: REWARD_NUMBER_FONT_SIZE,
    lineHeight: REWARD_NUMBER_LINE_HEIGHT,
    fontWeight: REWARD_NUMBER_TEXT_WEIGHT,
    textAlign: 'center' as const,
  };

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: REWARD_NUMBER_LINE_HEIGHT,
      }}
    >
      <Text style={[baseTextStyle, { opacity: 0 }]}>{rewardText}</Text>
      {REWARD_NUMBER_OUTLINE_OFFSETS.map(([x, y], index) => (
        <Text
          key={`reward-outline-${index}`}
          style={[
            baseTextStyle,
            {
              position: 'absolute',
              color: REWARD_NUMBER_OUTLINE_COLOR,
              transform: [
                { translateX: x * REWARD_NUMBER_OUTLINE_OFFSET },
                { translateY: y * REWARD_NUMBER_OUTLINE_OFFSET },
              ],
            },
          ]}
        >
          {rewardText}
        </Text>
      ))}
      <Text style={[baseTextStyle, { position: 'absolute' }]}>{rewardText}</Text>
    </View>
  );
}

export default function ResultsScreen() {
  const screenWipe = useScreenWipe();
  const params = useLocalSearchParams<{
    levelId?: string;
    stars?: string;
    coinReward?: string;
    won?: string;
  }>();
  const [shouldAnimateStars, setShouldAnimateStars] = useState(false);
  const completedLevelId = Math.max(0, Math.floor(Number(params.levelId ?? 0)));
  const earnedStars = Math.max(0, Math.min(3, Number(params.stars ?? 0)));
  const won = params.won === '1';
  const parsedCoinReward = Number(params.coinReward);
  const coinReward = Number.isFinite(parsedCoinReward)
    ? Math.max(0, Math.floor(parsedCoinReward))
    : won
      ? FIRST_CLEAR_COIN_REWARD
      : 0;
  const starSlots = [0, 1, 2];
  const continueButtonScale = useRef(new Animated.Value(1)).current;
  const rewardCountProgress = useRef(new Animated.Value(0)).current;
  const [displayCoinReward, setDisplayCoinReward] = useState(0);

  useEffect(() => {
    screenWipe.setScreenReady();
    setShouldAnimateStars(false);
    setDisplayCoinReward(0);
    rewardCountProgress.stopAnimation();
    rewardCountProgress.setValue(0);

    const starTimer = setTimeout(() => {
      setShouldAnimateStars(true);
    }, 650);

    const rewardListenerId = rewardCountProgress.addListener(({ value }) => {
      setDisplayCoinReward(Math.min(coinReward, Math.floor(value)));
    });
    const rewardTimer =
      coinReward > 0
        ? setTimeout(() => {
            Animated.timing(rewardCountProgress, {
              toValue: coinReward,
              duration: REWARD_COUNT_DURATION_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }).start(({ finished }) => {
              if (finished) {
                setDisplayCoinReward(coinReward);
              }
            });
          }, REWARD_COUNT_DELAY_MS)
        : null;

    return () => {
      clearTimeout(starTimer);
      if (rewardTimer) {
        clearTimeout(rewardTimer);
      }
      rewardCountProgress.removeListener(rewardListenerId);
      rewardCountProgress.stopAnimation();
    };
  }, [coinReward, rewardCountProgress, screenWipe]);

  function animateContinueButton(value: number) {
    Animated.spring(continueButtonScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
      <Image
        source={backgroundRuntimeAssets.finish}
        resizeMode="cover"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <View
        style={{
          width: '125%',
          maxWidth: 600,
          aspectRatio: 1651 / 953,
        }}
      >
        <Image
          source={backgroundRuntimeAssets.finishBoard}
          resizeMode="contain"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: STAR_TOP,
            left: '15%',
            right: '15%',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ translateX: STAR_ROW_OFFSET_X }],
          }}
        >
          {starSlots.map((slot) => (
            <AnimatedFillStar key={slot} filled={shouldAnimateStars && slot < earnedStars} delayMs={slot * 340} />
          ))}
        </View>
        <Image
          source={coinRuntimeAssets.icon}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: REWARD_COIN_TOP,
            alignSelf: 'center',
            width: REWARD_COIN_SIZE,
            height: REWARD_COIN_SIZE,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: REWARD_TEXT_TOP,
            alignSelf: 'center',
            alignItems: 'center',
          }}
        >
          <RewardNumberText value={displayCoinReward} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={() => {
            screenWipe.replace({
              pathname: '/map',
              params:
                completedLevelId > 0
                  ? {
                      animateLevel: String(completedLevelId),
                      stars: String(earnedStars),
                    }
                  : undefined,
            });
          }}
          onPressIn={() => animateContinueButton(0.94)}
          onPressOut={() => animateContinueButton(1)}
          style={{
            position: 'absolute',
            top: CONTINUE_BUTTON_TOP,
            alignSelf: 'center',
            width: CONTINUE_BUTTON_WIDTH,
            aspectRatio: CONTINUE_BUTTON_ASPECT_RATIO,
          }}
        >
          <Animated.Image
            source={uiRuntimeAssets.finishContinueButton}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              width: '100%',
              height: '100%',
              transform: [{ scale: continueButtonScale }],
            }}
          />
        </Pressable>
      </View>
    </View>
  );
}
