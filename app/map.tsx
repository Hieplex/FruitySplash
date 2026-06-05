import type { Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, Pressable, View, type ImageSourcePropType } from 'react-native';
import { warmGameplayAssets } from '@/game/assets/preload-assets.native';
import { backgroundRuntimeAssets, challengeRuntimeAssets, coinRuntimeAssets } from '@/game/assets/runtime-assets';
import { MAX_WALLET_COINS } from '@/state/progress-helpers';
import { useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';

const returnButtonImage = require('../assets/fruity/Buttons/Return.png');
const RETURN_BUTTON_TOP = 28;
const RETURN_BUTTON_LEFT = 16;
const RETURN_BUTTON_SIZE = 86;
const COIN_COUNTER_TOP = 30;
const COIN_COUNTER_RIGHT = 14;
const COIN_COUNTER_SPILL_LEFT = 26;
const COIN_COUNTER_HEIGHT = 42;
const COIN_COUNTER_WIDTH = 164;
const COIN_ICON_SIZE = 90;
const COIN_DIGIT_WIDTH = 21;
const COIN_DIGIT_HEIGHT = 32;
const COIN_COUNTER_RADIUS = 21;

const challengePositions = [
  { left: '58%', top: '17%' },
  { left: '64%', top: '25%' },
  { left: '35%', top: '30%' },
  { left: '53%', top: '35%' },
  { left: '68%', top: '45%' },
  { left: '57%', top: '55%' },
  { left: '30%', top: '64%' },
  { left: '55%', top: '72%' },
  { left: '42%', top: '85%' },
  { left: '55%', top: '93%' },
] as const;

const visibleChallengeAssets = challengeRuntimeAssets.slice(0, challengePositions.length);

function getCoinDigits(coins: number) {
  return String(Math.max(0, Math.min(MAX_WALLET_COINS, Math.floor(coins))))
    .split('')
    .map((digit) => digit as keyof typeof coinRuntimeAssets.digits);
}

function CoinCounter({ coins, onPress }: { coins: number; onPress: () => void }) {
  const digits = getCoinDigits(coins);
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable
      accessibilityLabel={`Coins ${Math.max(0, Math.min(MAX_WALLET_COINS, Math.floor(coins)))}`}
      accessibilityHint="Opens the coin shop"
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        position: 'absolute',
        top: COIN_COUNTER_TOP,
        right: COIN_COUNTER_RIGHT,
        width: COIN_COUNTER_WIDTH + COIN_COUNTER_SPILL_LEFT,
        height: COIN_COUNTER_HEIGHT + 8,
        zIndex: 6,
        overflow: 'visible',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 15,
          right: 0,
          width: COIN_COUNTER_WIDTH,
          height: COIN_COUNTER_HEIGHT,
          transform: [{ scale }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: COIN_COUNTER_RADIUS,
            backgroundColor: '#6E36C9',
            borderWidth: 3,
            borderColor: '#F7C94A',
            shadowColor: '#3B0E82',
            shadowOpacity: 0.34,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 7 },
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 8,
              top: 1,
              width: 700,
              height: 3,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.22)',
              transform: [{ rotate: '0deg' }],
            }}
          />
                    <View
            style={{
              position: 'absolute',
              left: 8,
              top: 1,
              width: 700,
              height: 3,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.22)',
              transform: [{ rotate: '0deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 16,
              bottom: 3,
              width: 38,
              height: 1,
              borderRadius: 999,
              backgroundColor: 'rgba(255, 248, 188, 0.52)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 16,
              bottom: 3,
              width: 30,
              height: 1,
              borderRadius: 999,
              backgroundColor: 'rgba(255, 232, 126, 0.62)',
            }}
          />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingLeft: 30,
              paddingRight: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                height: COIN_COUNTER_HEIGHT,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginLeft: 2,
              }}
            >
              {digits.map((digit, index) => (
                <Image
                  key={`${index}-${digit}`}
                  source={coinRuntimeAssets.digits[digit]}
                  fadeDuration={0}
                  resizeMode="contain"
                  style={{
                    width: COIN_DIGIT_WIDTH,
                    height: COIN_DIGIT_HEIGHT,
                    marginLeft: index === 0 ? 0 : -7,
                  }}
                />
              ))}
            </View>
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            inset: 3,
            borderRadius: COIN_COUNTER_RADIUS - 3,
            borderWidth: 1,
            borderColor: 'rgba(255, 250, 210, 0.42)',
          }}
          pointerEvents="none"
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 10,
          top: -10,
          width: COIN_ICON_SIZE,
          height: COIN_ICON_SIZE,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale }],
        }}
      >
        <Image
          source={coinRuntimeAssets.icon}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            width: COIN_ICON_SIZE,
            height: COIN_ICON_SIZE,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

function ChallengeMapButton({
  onOpen,
  index,
  locked,
  source,
  position,
}: {
  onOpen: (href: Href) => void;
  index: number;
  locked: boolean;
  source: ImageSourcePropType;
  position: (typeof challengePositions)[number];
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (locked) {
      return;
    }

    void warmGameplayAssets();

    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 42,
        bounciness: 4,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }),
    ]).start(() => onOpen(`/level/${index + 1}`));
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Challenge ${index + 1}`}
      hitSlop={8}
      onPress={handlePress}
      style={{
        position: 'absolute',
        width: 58,
        height: 58,
        marginLeft: -29,
        marginTop: -29,
        opacity: locked ? 0.45 : 1,
        ...position,
      }}
    >
      <Animated.Image
        fadeDuration={0}
        source={source}
        resizeMode="contain"
        style={{
          width: '100%',
          height: '100%',
          transform: [{ scale }],
        }}
      />
    </Pressable>
  );
}

export default function MapScreen() {
  const screenWipe = useScreenWipe();
  const progress = useProgress();
  const returnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void warmGameplayAssets();
    screenWipe.setScreenReady();
  }, [screenWipe]);

  function animateReturnButton(value: number) {
    Animated.spring(returnScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  function handleCoinCounterPress() {
    // Reserved for a future shop route.
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ImageBackground source={backgroundRuntimeAssets.map} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to chapters"
          onPress={() => screenWipe.replace('/chapters')}
          onPressIn={() => animateReturnButton(0.92)}
          onPressOut={() => animateReturnButton(1)}
          style={{
            position: 'absolute',
            top: RETURN_BUTTON_TOP,
            left: RETURN_BUTTON_LEFT,
            width: RETURN_BUTTON_SIZE,
            height: RETURN_BUTTON_SIZE,
            zIndex: 5,
          }}
        >
          <Animated.Image
            source={returnButtonImage}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              width: '100%',
              height: '100%',
              transform: [{ scale: returnScale }],
            }}
          />
        </Pressable>
        <CoinCounter coins={progress.wallet.coins} onPress={handleCoinCounterPress} />
        {visibleChallengeAssets.map((source, index) => (
          <ChallengeMapButton
            key={index}
            onOpen={screenWipe.push}
            index={index}
            locked={index + 1 > progress.unlockedLevel}
            source={source}
            position={challengePositions[index]}
          />
        ))}
      </ImageBackground>
    </View>
  );
}
