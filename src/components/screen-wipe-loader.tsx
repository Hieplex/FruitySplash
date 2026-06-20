import { useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const PANEL_COLOR = '#ff82b2';
const PANEL_OUTLINE = '#111111';
const PANEL_OVERLAP = 64;
const PANEL_HALF_OVERLAP = PANEL_OVERLAP / 2;
const CLOSE_DURATION_MS = 300;
const OPEN_DURATION_MS = 360;
const TEXT_JUMP_DURATION_MS = 180;
const TEXT_SIZE = 46;
const TEXT_OUTLINE_OFFSET = 3;
const TEXT_BOTTOM_PANEL_TOP_OFFSET = 22;
const TEXT_TOP_PANEL_BOTTOM_OFFSET = 18;

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
  const { height: windowHeight } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const height = measuredHeight || windowHeight;
  const [fontsLoaded] = useFonts({
    SuperChiby: require('../../assets/Fonts/super-chiby-font/SuperChiby-BL62V.ttf'),
  });
  const topTranslate = useRef(new Animated.Value(phase === 'hidden' || phase === 'opening' ? -height : 0)).current;
  const bottomTranslate = useRef(new Animated.Value(phase === 'hidden' || phase === 'opening' ? height : 0)).current;
  const textJumpProgress = useRef(new Animated.Value(phase === 'opening' ? 1 : 0)).current;
  const lastPhaseRef = useRef<ScreenWipePhase>(phase);
  const animationDistanceRef = useRef(height);
  const textJumpDoneRef = useRef(phase === 'opening');

  const panelHeight = useMemo(() => height / 2 + PANEL_HALF_OVERLAP, [height]);
  const bottomPanelTop = useMemo(() => height / 2 - PANEL_HALF_OVERLAP, [height]);
  const bottomTextY = useMemo(
    () => bottomPanelTop + TEXT_BOTTOM_PANEL_TOP_OFFSET,
    [bottomPanelTop],
  );
  const topTextY = useMemo(
    // The bottom panel sits on top of the overlap zone when closed, so the visible
    // "bottom of the top panel" is just above the bottom panel's top edge.
    () => bottomPanelTop - TEXT_SIZE - TEXT_TOP_PANEL_BOTTOM_OFFSET,
    [bottomPanelTop],
  );

  useEffect(() => {
    animationDistanceRef.current = height;

    if (phase === 'hidden') {
      topTranslate.setValue(-height);
      bottomTranslate.setValue(height);
    }
  }, [bottomTranslate, height, phase, topTranslate]);

  useEffect(() => {
    if (lastPhaseRef.current === phase) {
      return;
    }
    lastPhaseRef.current = phase;

    if (phase === 'hidden') {
      topTranslate.stopAnimation();
      bottomTranslate.stopAnimation();
      textJumpProgress.stopAnimation();
      topTranslate.setValue(-animationDistanceRef.current);
      bottomTranslate.setValue(animationDistanceRef.current);
      textJumpProgress.setValue(0);
      textJumpDoneRef.current = false;
      return;
    }

    if (phase === 'closed') {
      topTranslate.stopAnimation();
      bottomTranslate.stopAnimation();
      textJumpProgress.stopAnimation();
      topTranslate.setValue(0);
      bottomTranslate.setValue(0);
      textJumpProgress.setValue(0);
      textJumpDoneRef.current = false;
      return;
    }

    if (phase === 'closing') {
      textJumpProgress.stopAnimation();
      textJumpProgress.setValue(0);
      textJumpDoneRef.current = false;
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
      const shouldJumpText = !textJumpDoneRef.current;
      const jumpAnimation = shouldJumpText
        ? Animated.timing(textJumpProgress, {
            toValue: 1,
            duration: TEXT_JUMP_DURATION_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        : Animated.timing(textJumpProgress, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          });

      textJumpDoneRef.current = true;

      const panelAnimation = Animated.parallel([
        Animated.timing(topTranslate, {
          toValue: -animationDistanceRef.current,
          duration: OPEN_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslate, {
          toValue: animationDistanceRef.current,
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
  }, [bottomTranslate, onClosed, onOpened, phase, textJumpProgress, topTranslate]);

  if (phase === 'hidden') {
    return null;
  }

  const bottomFollowFactor = textJumpProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const topFollowFactor = textJumpProgress;
  const textTranslateY = Animated.add(
    bottomTextY,
    Animated.add(
      Animated.multiply(bottomTranslate, bottomFollowFactor),
      Animated.add(
        textJumpProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, topTextY - bottomTextY],
        }),
        Animated.multiply(topTranslate, topFollowFactor),
      ),
    ),
  );

  return (
    <View
      pointerEvents="auto"
      onLayout={(event) => {
        const nextHeight = Math.round(event.nativeEvent.layout.height);

        if (nextHeight > 0 && nextHeight !== measuredHeight) {
          setMeasuredHeight(nextHeight);
        }
      }}
      style={StyleSheet.absoluteFill}
    >
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
            top: bottomPanelTop,
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
