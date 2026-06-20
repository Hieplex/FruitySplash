import { useEffect } from 'react';
import { Switch, Text, View } from 'react-native';
import { AnimatedButton } from '@/components/animated-button';
import { useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function SettingsScreen() {
  const screenWipe = useScreenWipe();
  const progress = useProgress();

  useEffect(() => {
    screenWipe.setScreenReady();
  }, [screenWipe]);

  return (
    <View style={{ flex: 1, padding: spacing.lg, gap: spacing.xl, backgroundColor: colors.cream }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.cocoa, fontSize: 18, fontWeight: '700' }}>Settings</Text>
        <Text style={{ color: colors.ink, fontSize: 34, fontWeight: '900' }}>Game feel</Text>
      </View>

      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: spacing.radiusLg,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Sound</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            Keep the fruit pops soft and relaxing.
          </Text>
        </View>
        <Switch value={progress.soundEnabled} onValueChange={progress.setSoundEnabled} />
      </View>

      <AnimatedButton label="Back to menu" kind="secondary" onPress={() => screenWipe.replace('/map')} />
    </View>
  );
}
