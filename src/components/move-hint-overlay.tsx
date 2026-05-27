import { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { RecommendedMove } from '@/game/move-hints';

type MoveHintOverlayProps = {
  hint: RecommendedMove | null;
  tileSize: number;
  gap: number;
  boardPadding: number;
};

export function MoveHintOverlay({ hint, tileSize, gap, boardPadding }: MoveHintOverlayProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hint) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 880,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [hint, progress]);

  const cells = useMemo(() => {
    if (!hint) {
      return [];
    }

    const unique = new Map<string, { row: number; col: number }>();
    const hintCells = hint.hintCells ?? hint.matchedCells ?? [];
    hintCells.forEach((cell) => {
      unique.set(`${cell.row}:${cell.col}`, cell);
    });
    return [...unique.values()];
  }, [hint]);

  if (!hint) {
    return null;
  }

  const cellPitch = tileSize + gap;
  const pulseScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 1.12, 0.92],
  });
  const pulseOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.95, 0.35],
  });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, zIndex: 18, elevation: 18 }}>
      {cells.map((cell) => (
        <Animated.View
          key={`${cell.row}:${cell.col}`}
          style={{
            position: 'absolute',
            top: boardPadding + cell.row * cellPitch - 3,
            left: boardPadding + cell.col * cellPitch - 3,
            width: tileSize + 6,
            height: tileSize + 6,
            borderRadius: (tileSize + 6) / 2,
            borderWidth: 3,
            borderColor: 'rgba(255, 251, 181, 0.98)',
            backgroundColor: 'rgba(255, 244, 150, 0.16)',
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
      ))}
    </View>
  );
}
