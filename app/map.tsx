import { useRef } from 'react';
import { router } from 'expo-router';
import { Animated, ImageBackground, Pressable, View, type ImageSourcePropType } from 'react-native';
import { backgroundRuntimeAssets, challengeRuntimeAssets } from '@/game/assets/runtime-assets';
import { useProgress } from '@/state/progress-store';
import { colors } from '@/theme/colors';

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

function ChallengeMapButton({
  index,
  locked,
  source,
  position,
}: {
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
    ]).start(() => router.push(`/level/${index + 1}`));
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
  const progress = useProgress();

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ImageBackground source={backgroundRuntimeAssets.map} resizeMode="cover" style={{ flex: 1 }}>
        {visibleChallengeAssets.map((source, index) => (
          <ChallengeMapButton
            key={index}
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
