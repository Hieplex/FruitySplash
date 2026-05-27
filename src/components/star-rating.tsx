import { View } from 'react-native';
import { uiAssets } from '@/game/assets/manifest';
import { FruitTileImage } from '@/components/fruit-tile';
import { spacing } from '@/theme/spacing';

export function StarRating({ value, size = 24 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(3, value));

  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {Array.from({ length: 3 }, (_, index) => (
        <FruitTileImage
          key={index}
          uri={uiAssets.stars.source.uri}
          svg={uiAssets.stars.source.svg}
          size={size}
          opacity={index < clamped ? 1 : 0.25}
        />
      ))}
    </View>
  );
}
