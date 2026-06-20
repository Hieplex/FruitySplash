import { Animated, Image, Pressable, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

const avatarFrameImage = require('../../assets/Avatar/AvatarFrame.png');
const AVATAR_IMAGE_SIZE_RATIO = 0.7;
const AVATAR_IMAGE_OFFSET_X_RATIO = -0.02;
const AVATAR_IMAGE_OFFSET_Y_RATIO = -0.02;

type AvatarFrameButtonProps = {
  accessibilityLabel: string;
  fallbackLabel: string;
  imageUri?: string | null;
  loading?: boolean;
  error?: boolean;
  scale: Animated.Value;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  size: number;
};

export function AvatarFrameButton({
  accessibilityLabel,
  fallbackLabel,
  imageUri,
  loading = false,
  error = false,
  scale,
  onPress,
  onPressIn,
  onPressOut,
  size,
}: AvatarFrameButtonProps) {
  const innerSize = size * AVATAR_IMAGE_SIZE_RATIO;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: innerSize,
            height: innerSize,
            borderRadius: 7,
            backgroundColor: '#1D0A04',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              { translateX: size * AVATAR_IMAGE_OFFSET_X_RATIO },
              { translateY: size * AVATAR_IMAGE_OFFSET_Y_RATIO },
            ],
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} fadeDuration={0} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: error ? colors.danger : '#FFEAA1',
                fontSize: loading ? 18 : 31,
                fontWeight: '900',
              }}
            >
              {loading ? '...' : fallbackLabel}
            </Text>
          )}
        </View>
        <Image
          source={avatarFrameImage}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            inset: 0,
            width: size,
            height: size,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
