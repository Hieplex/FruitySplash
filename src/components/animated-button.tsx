import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function AnimatedButton({
  label,
  onPress,
  kind = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  const backgroundColor = kind === 'primary' ? colors.coral : colors.white;
  const textColor = kind === 'primary' ? colors.white : colors.ink;
  const borderColor = kind === 'primary' ? colors.coralDeep : 'rgba(122, 74, 46, 0.12)';

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: spacing.radiusPill,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          borderWidth: 1.5,
          borderColor,
          opacity: disabled ? 0.55 : 1,
          shadowColor: kind === 'primary' ? colors.coral : colors.shadow,
          shadowOpacity: kind === 'primary' ? 0.26 : 0.14,
          shadowRadius: kind === 'primary' ? 16 : 10,
          shadowOffset: { width: 0, height: kind === 'primary' ? 8 : 5 },
          elevation: kind === 'primary' ? 6 : 3,
        }}
      >
        <Text style={{ color: textColor, fontSize: 17, fontWeight: '800' }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
