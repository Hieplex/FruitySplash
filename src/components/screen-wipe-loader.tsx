import { useEffect, useMemo, useRef } from 'react';
import { useFonts } from 'expo-font';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const PANEL_COLOR = '#ff82b2';
const PANEL_OUTLINE = '#111111';
const PANEL_OVERLAP = 64;
const CLOSE_DURATION_MS = 300;
const OPEN_DURATION_MS = 360;
const TEXT_JUMP_DURATION_MS = 180;
const TEXT_SIZE = 46;
const TEXT_OUTLINE_OFFSET = 3;
const TEXT_BOTTOM_PANEL_OFFSET = 85;
const TEXT_TOP_PANEL_OFFSET = 74;

export type ScreenWipePhase = 'hidden' | 'closed' | 'closing' | 'opening';

export function ScreenWipeLoader({
  phase,
  onClosed,
  onOpened,
}: {
  phase: ScreenWipePhase;
  onClosed?: () => void;
  onOpened?: () => void;
}) {
  const { height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    SuperChiby: require('../../assets/Fonts/super-chiby-font/SuperChiby-BL62V.ttf'),
  });
  const topTranslate = useRef(new Animated.Value(phase === 'hidden' || phase === 'opening' ? -height : 0)).current;
  const bottomTranslate = useRef(new Animated.Value(phase === 'hidden' || phase === 'opening' ? height : 0)).current;
  const textJumpProgress = useRef(new Animated.Value(phase === 'opening' ? 1 : 0)).current;
  const lastPhaseRef = useRef<ScreenWipePhase>(phase);

  const panelHeight = useMemo(() => height / 2 + PANEL_OVERLAP, [height]);
  const bottomPanelTop = useMemo(() => height - panelHeight, [height, panelHeight]);
  const bottomTextY = useMemo(() => bottomPanelTop + TEXT_BOTTOM_PANEL_OFFSET, [bottomPanelTop]);
  const topTextY = useMemo(() => panelHeight - TEXT_TOP_PANEL_OFFSET - TEXT_SIZE, [panelHeight]);

  useEffect(() => {
    if (lastPhaseRef.current === phase) {
      return;
    }
    lastPhaseRef.current = phase;

    if (phase === 'hidden') {
      topTranslate.stopAnimation();
      bottomTranslate.stopAnimation();
      textJumpProgress.stopAnimation();
      topTranslate.setValue(-height);
      bottomTranslate.setValue(height);
      textJumpProgress.setValue(0);
      return;
    }

    if (phase === 'closed') {
      topTranslate.stopAnimation();
      bottomTranslate.stopAnimation();
      textJumpProgress.stopAnimation();
      topTranslate.setValue(0);
      bottomTranslate.setValue(0);
      textJumpProgress.setValue(0);
      return;
    }

    if (phase === 'closing') {
      textJumpProgress.stopAnimation();
      textJumpProgress.setValue(0);
      const animation = Animated.parallel([
        Animated.timing(topTranslate, {
          toValue: 0,
          duration: CLOSE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslate, {
          toValue: 0,
          duration: CLOSE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animation.start(({ finished }) => {
        if (finished) {
          onClosed?.();
        }
      });

      return () => animation.stop();
    }

    if (phase === 'opening') {
      const jumpAnimation = Animated.timing(textJumpProgress, {
        toValue: 1,
        duration: TEXT_JUMP_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });

      const panelAnimation = Animated.parallel([
        Animated.timing(topTranslate, {
          toValue: -height,
          duration: OPEN_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslate, {
          toValue: height,
          duration: OPEN_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      const animation = Animated.sequence([jumpAnimation, panelAnimation]);

      animation.start(({ finished }) => {
        if (finished) {
          onOpened?.();
        }
      });

      return () => animation.stop();
    }
  }, [bottomTranslate, height, onClosed, onOpened, phase, textJumpProgress, topTranslate]);

  if (phase === 'hidden') {
    return null;
  }

  const bottomPanelTextY = Animated.add(bottomTextY, bottomTranslate);
  const textBaseY = Animated.add(
    bottomPanelTextY,
    textJumpProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, topTextY - bottomTextY],
    }),
  );
  const textTranslateY = Animated.add(
    textBaseY,
    Animated.multiply(
      textJumpProgress,
      Animated.add(topTranslate, Animated.multiply(bottomTranslate, -1)),
    ),
  );

  return (
    <View pointerEvents="auto" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.panel,
          styles.topPanel,
          {
            height: panelHeight,
            transform: [{ translateY: topTranslate }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.panel,
          styles.bottomPanel,
          {
            height: panelHeight,
            transform: [{ translateY: bottomTranslate }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.textWrapper,
          {
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <OutlinedLoadingText fontsLoaded={fontsLoaded} />
      </Animated.View>
    </View>
  );
}

function OutlinedLoadingText({ fontsLoaded }: { fontsLoaded: boolean }) {
  return (
    <View style={styles.textBounds}>
      {OUTLINE_SHADOWS.map((shadow, index) => (
        <Text
          key={index}
          style={[
            styles.loadingText,
            styles.loadingTextOutline,
            fontsLoaded ? styles.loadingTextFont : null,
            {
              transform: [{ translateX: shadow.x }, { translateY: shadow.y }],
            },
          ]}
        >
          Loading...
        </Text>
      ))}
      <Text style={[styles.loadingText, fontsLoaded ? styles.loadingTextFont : null]}>Loading...</Text>
    </View>
  );
}

const OUTLINE_SHADOWS = [
  { x: -TEXT_OUTLINE_OFFSET, y: 0 },
  { x: TEXT_OUTLINE_OFFSET, y: 0 },
  { x: 0, y: -TEXT_OUTLINE_OFFSET },
  { x: 0, y: TEXT_OUTLINE_OFFSET },
  { x: -TEXT_OUTLINE_OFFSET, y: -TEXT_OUTLINE_OFFSET },
  { x: TEXT_OUTLINE_OFFSET, y: -TEXT_OUTLINE_OFFSET },
  { x: -TEXT_OUTLINE_OFFSET, y: TEXT_OUTLINE_OFFSET },
  { x: TEXT_OUTLINE_OFFSET, y: TEXT_OUTLINE_OFFSET },
] as const;

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: PANEL_COLOR,
    borderColor: PANEL_OUTLINE,
    borderLeftWidth: 5,
    borderRightWidth: 5,
  },
  topPanel: {
    top: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
  },
  bottomPanel: {
    bottom: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
  },
  textWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  textBounds: {
    width: 280,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: TEXT_SIZE,
    lineHeight: 52,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingTextOutline: {
    color: PANEL_OUTLINE,
  },
  loadingTextFont: {
    fontFamily: 'SuperChiby',
    fontWeight: '400',
  },
});
