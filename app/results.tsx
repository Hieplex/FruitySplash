import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { AnimatedButton } from '@/components/animated-button';
import { StarRating } from '@/components/star-rating';
import { LEVELS } from '@/game/levels/levels';
import { getResultsRouteModel } from '@/navigation/results-route';
import { useProgress } from '@/state/progress-store';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    levelId?: string;
    score?: string;
    stars?: string;
    won?: string;
  }>();
  const progress = useProgress();
  const score = Number(params.score ?? 0);
  const stars = Number(params.stars ?? 0);
  const won = params.won === '1';
  const routeModel = getResultsRouteModel({
    levelIdParam: params.levelId,
    won,
    progress,
    levelIds: LEVELS.map((level) => level.id),
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.cream }}>
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: spacing.radiusLg,
          padding: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <Text style={{ color: won ? colors.success : colors.danger, fontSize: 18, fontWeight: '800' }}>
          {won ? 'Level cleared' : 'Time up'}
        </Text>
        <Text style={{ color: colors.ink, fontSize: 34, fontWeight: '900' }}>Level {routeModel.displayLevelId}</Text>
        <StarRating value={stars} size={30} />
        <Text style={{ color: colors.cocoa, fontSize: 18, fontWeight: '700' }}>Score {score}</Text>

        <View style={{ gap: spacing.md }}>
          <AnimatedButton label={routeModel.primaryLabel} onPress={() => router.replace(routeModel.primaryRoute)} />
          <AnimatedButton label="Level map" kind="secondary" onPress={() => router.replace('/map')} />
        </View>
      </View>
    </View>
  );
}
