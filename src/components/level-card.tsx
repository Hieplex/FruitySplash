import { Pressable, Text, View } from 'react-native';
import { StarRating } from '@/components/star-rating';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function LevelCard({
  levelId,
  stars,
  unlocked,
  onPress,
}: {
  levelId: number;
  stars: number;
  unlocked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!unlocked}
      style={{
        width: '31%',
        aspectRatio: 1,
        borderRadius: spacing.radiusLg,
        backgroundColor: unlocked ? colors.white : 'rgba(255,255,255,0.55)',
        borderWidth: 1,
        borderColor: colors.line,
        justifyContent: 'space-between',
        padding: spacing.md,
      }}
    >
      <Text style={{ color: unlocked ? colors.ink : colors.muted, fontSize: 22, fontWeight: '800' }}>{levelId}</Text>
      <View style={{ alignItems: 'flex-start' }}>
        <StarRating value={stars} size={18} />
      </View>
    </Pressable>
  );
}
