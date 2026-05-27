import { Text, View } from 'react-native';
import { StarRating } from '@/components/star-rating';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function HudPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: spacing.radiusMd,
        backgroundColor: colors.panelStrong,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        gap: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.7)',
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: accent, fontSize: 18, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}

export function GameHud({
  level,
  score,
  timeLeft,
  targetScore,
  stars,
}: {
  level: number;
  score: number;
  timeLeft: number;
  targetScore: number;
  stars: number;
}) {
  return (
    <View
      style={{
        borderRadius: spacing.radiusLg,
        backgroundColor: colors.panel,
        padding: spacing.md,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.72)',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Fruity Splash</Text>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '900' }}>Level {level}</Text>
        </View>
        <StarRating value={stars} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <HudPill label="Score" value={score} accent={colors.berry} />
        <HudPill label="Target" value={targetScore} accent={colors.orange} />
        <HudPill label="Timer" value={`${timeLeft}s`} accent={colors.timer} />
      </View>
    </View>
  );
}
