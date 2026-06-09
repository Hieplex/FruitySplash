import { useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import { Animated, Image, ImageBackground, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { warmGameplayAssets } from '@/game/assets/preload-assets.native';
import { barRuntimeAssets, challengeRuntimeAssets, coinRuntimeAssets, treeMapRuntimeAssets } from '@/game/assets/runtime-assets';
import { getTreeBandIndexForLevel, TREE_LEVELS_PER_BAND } from '@/navigation/tree-map-model';
import { buildTreeMapViewModel } from '@/navigation/tree-map-view-model';
import { getCompletedLevelCountFromStart, getLastCompletedLevelIdFromStart, MAX_WALLET_COINS } from '@/state/progress-helpers';
import { useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';

const returnButtonImage = require('../assets/fruity/Buttons/Return.png');

const RETURN_BUTTON_TOP = 28;
const RETURN_BUTTON_LEFT = 16;
const RETURN_BUTTON_SIZE = 86;
const COIN_COUNTER_TOP = 30;
const COIN_COUNTER_RIGHT = 14;
const COIN_COUNTER_SPILL_LEFT = 26;
const COIN_COUNTER_HEIGHT = 42;
const COIN_COUNTER_WIDTH = 164;
const COIN_ICON_SIZE = 90;
const COIN_DIGIT_WIDTH = 21;
const COIN_DIGIT_HEIGHT = 32;
const COIN_COUNTER_RADIUS = 21;
const ROOT_IMAGE_WIDTH_RATIO = 1.2;
const ROOT_IMAGE_HEIGHT_EXTRA = 110;
const ROOT_IMAGE_BOTTOM_OFFSET = -100;
const ROOT_BAND_TOP_INTO_CLOUD = 34;
const TREE_IMAGE_WIDTH_RATIO = 1.1;
const TREE_IMAGE_HEIGHT_RATIO = 1;
const TREE_BAND_BOTTOM_INTO_CLOUD = 30;
const ROOT_CLOUD_WIDTH_RATIO = 1.2;
const ROOT_CLOUD_ASPECT_RATIO = 3;
const ROOT_CLOUD_TOP_OFFSET = 0;
const TREE_TEST_BAND_SCROLL_HEIGHT_RATIO = 0.9;
const TREE_TEST_MAX_LEVEL = 200;
const TREE_REVEAL_BAND_COUNT = 1;
const TREE_SOCKET_SIZE = 72;
const TREE_SOCKET_NUMBER_COLOR = '#FFFFFF';
const TREE_SOCKET_NUMBER_OUTLINE = '#92D8FF';
const TREE_SOCKET_NUMBER_OUTLINE_OFFSET = 1;
const TREE_NEXT_BAND_PEEK = 240;
const ROOT_SOCKET_VERTICAL_OFFSET = -55;
const TREE_SOCKET_VERTICAL_OFFSET = 0;
const SOCKET_STAR_SIZE = 48;
const SOCKET_STAR_Y_OFFSETS = [-12, -25, -12] as const;
const SOCKET_STAR_X_OFFSETS = [-28, 0, 28] as const;
const SOCKET_STAR_ARC_TOP_OFFSET = -14;

function TreeSocket({
  left,
  top,
  levelId,
  fontsLoaded,
  locked,
  earnedStars,
  completed,
  onPress,
}: {
  left: number;
  top: number;
  levelId: number;
  fontsLoaded: boolean;
  locked: boolean;
  earnedStars: number;
  completed: boolean;
  onPress: (levelId: number) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const textSize = levelId >= 100 ? 18 : levelId >= 10 ? 22 : 26;
  const textLineHeight = levelId >= 100 ? 20 : levelId >= 10 ? 24 : 28;
  const textStyle = {
    position: 'absolute' as const,
    color: TREE_SOCKET_NUMBER_COLOR,
    fontSize: textSize,
    lineHeight: textLineHeight,
    fontFamily: fontsLoaded ? 'SuperChiby' : undefined,
  };

  function animateTo(pressed: boolean) {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? 0.94 : 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: pressed ? 3 : 6,
      }),
      Animated.spring(translateY, {
        toValue: pressed ? 3 : 0,
        useNativeDriver: true,
        speed: 28,
        bounciness: pressed ? 3 : 6,
      }),
    ]).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Level ${levelId}`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      hitSlop={8}
      onPress={() => onPress(levelId)}
      onPressIn={() => {
        if (!locked) {
          animateTo(true);
        }
      }}
      onPressOut={() => {
        if (!locked) {
          animateTo(false);
        }
      }}
      style={{
        position: 'absolute',
        left,
        top,
        width: TREE_SOCKET_SIZE,
        height: TREE_SOCKET_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(73, 32, 7, 0.35)',
        shadowOpacity: locked ? 0.12 : 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        zIndex: 6,
        opacity: locked ? 0.72 : 1,
      }}
    >
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: SOCKET_STAR_ARC_TOP_OFFSET,
            left: 0,
            right: 0,
            zIndex: 2,
            height: SOCKET_STAR_SIZE + 12,
          }}
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Image
              key={`${levelId}-star-${index}`}
              source={barRuntimeAssets.emptyStar}
              fadeDuration={0}
              resizeMode="contain"
              style={{
                position: 'absolute',
                left: '50%',
                marginLeft: -SOCKET_STAR_SIZE / 2 + SOCKET_STAR_X_OFFSETS[index],
                top: SOCKET_STAR_Y_OFFSETS[index],
                width: SOCKET_STAR_SIZE,
                height: SOCKET_STAR_SIZE,
                opacity: completed || earnedStars > 0 ? 0.95 : 0.82,
              }}
            />
          ))}
        </View>
        <Image
          source={treeMapRuntimeAssets.socket}
          fadeDuration={0}
          resizeMode="contain"
          style={{ width: TREE_SOCKET_SIZE, height: TREE_SOCKET_SIZE }}
        />
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          {[
            [-TREE_SOCKET_NUMBER_OUTLINE_OFFSET, 0],
            [TREE_SOCKET_NUMBER_OUTLINE_OFFSET, 0],
            [0, -TREE_SOCKET_NUMBER_OUTLINE_OFFSET],
            [0, TREE_SOCKET_NUMBER_OUTLINE_OFFSET],
          ].map(([x, y], index) => (
            <Animated.Text
              key={`${levelId}-outline-${index}`}
              style={[
                textStyle,
                {
                  color: TREE_SOCKET_NUMBER_OUTLINE,
                  transform: [{ translateX: x }, { translateY: y }],
                },
              ]}
            >
              {levelId}
            </Animated.Text>
          ))}
          <Animated.Text style={textStyle}>{levelId}</Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function getCoinDigits(coins: number) {
  return String(Math.max(0, Math.min(MAX_WALLET_COINS, Math.floor(coins))))
    .split('')
    .map((digit) => digit as keyof typeof coinRuntimeAssets.digits);
}

function CoinCounter({ coins, onPress }: { coins: number; onPress: () => void }) {
  const digits = getCoinDigits(coins);
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable
      accessibilityLabel={`Coins ${Math.max(0, Math.min(MAX_WALLET_COINS, Math.floor(coins)))}`}
      accessibilityHint="Opens the coin shop"
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        position: 'absolute',
        top: COIN_COUNTER_TOP,
        right: COIN_COUNTER_RIGHT,
        width: COIN_COUNTER_WIDTH + COIN_COUNTER_SPILL_LEFT,
        height: COIN_COUNTER_HEIGHT + 8,
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 15,
          right: 0,
          width: COIN_COUNTER_WIDTH,
          height: COIN_COUNTER_HEIGHT,
          transform: [{ scale }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: COIN_COUNTER_RADIUS,
            backgroundColor: '#6E36C9',
            borderWidth: 3,
            borderColor: '#F7C94A',
            shadowColor: '#3B0E82',
            shadowOpacity: 0.34,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 7 },
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 8,
              top: 1,
              width: 700,
              height: 3,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.22)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 16,
              bottom: 3,
              width: 38,
              height: 1,
              borderRadius: 999,
              backgroundColor: 'rgba(255, 248, 188, 0.52)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 16,
              bottom: 3,
              width: 30,
              height: 1,
              borderRadius: 999,
              backgroundColor: 'rgba(255, 232, 126, 0.62)',
            }}
          />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingLeft: 30,
              paddingRight: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                height: COIN_COUNTER_HEIGHT,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginLeft: 2,
              }}
            >
              {digits.map((digit, index) => (
                <Image
                  key={`${index}-${digit}`}
                  source={coinRuntimeAssets.digits[digit]}
                  fadeDuration={0}
                  resizeMode="contain"
                  style={{
                    width: COIN_DIGIT_WIDTH,
                    height: COIN_DIGIT_HEIGHT,
                    marginLeft: index === 0 ? 0 : -7,
                  }}
                />
              ))}
            </View>
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            inset: 3,
            borderRadius: COIN_COUNTER_RADIUS - 3,
            borderWidth: 1,
            borderColor: 'rgba(255, 250, 210, 0.42)',
          }}
          pointerEvents="none"
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 10,
          top: -10,
          width: COIN_ICON_SIZE,
          height: COIN_ICON_SIZE,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale }],
        }}
      >
        <Image
          source={coinRuntimeAssets.icon}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            width: COIN_ICON_SIZE,
            height: COIN_ICON_SIZE,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function MapScreen() {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    SuperChiby: require('../assets/Fonts/super-chiby-font/SuperChiby-BL62V.ttf'),
  });
  const screenWipe = useScreenWipe();
  const progress = useProgress();
  const scrollRef = useRef<ScrollView | null>(null);
  const returnScale = useRef(new Animated.Value(1)).current;
  const treeMapViewModel = buildTreeMapViewModel({
    progress,
    maxLevel:
      Math.max(challengeRuntimeAssets.length, TREE_TEST_MAX_LEVEL) +
      TREE_LEVELS_PER_BAND * TREE_REVEAL_BAND_COUNT,
  });
  const completedLevelCountFromStart = getCompletedLevelCountFromStart(progress);
  const effectiveCurrentLevelId = Math.min(
    Math.max(challengeRuntimeAssets.length, TREE_TEST_MAX_LEVEL) + TREE_LEVELS_PER_BAND * TREE_REVEAL_BAND_COUNT,
    getLastCompletedLevelIdFromStart(progress),
  );
  const completedBandCountFromStart = Math.floor(completedLevelCountFromStart / TREE_LEVELS_PER_BAND);
  const maxAccessibleBandIndex = Math.min(treeMapViewModel.bands.length - 1, Math.max(1, completedBandCountFromStart));
  const effectiveCurrentBandIndex = Math.min(getTreeBandIndexForLevel(effectiveCurrentLevelId), maxAccessibleBandIndex);
  const visibleBands = treeMapViewModel.bands.slice(0, maxAccessibleBandIndex + 1);
  const rootBand = visibleBands[0];
  const treeBands = visibleBands.slice(1);
  const previewBand = treeMapViewModel.bands[maxAccessibleBandIndex + 1] ?? null;
  const treeBandCount = treeBands.length;
  const rootImageWidth = width * ROOT_IMAGE_WIDTH_RATIO;
  const treeImageWidth = width * TREE_IMAGE_WIDTH_RATIO;
  const treeImageHeight = height * TREE_IMAGE_HEIGHT_RATIO;
  const extraScrollHeight = treeImageHeight * TREE_TEST_BAND_SCROLL_HEIGHT_RATIO * treeBandCount;
  const mapContentHeight = height + extraScrollHeight;
  const rootCloudWidth = width * ROOT_CLOUD_WIDTH_RATIO;
  const rootCloudHeight = rootCloudWidth / ROOT_CLOUD_ASPECT_RATIO;
  const rootCloudLeft = (width - rootCloudWidth) / 2;
  const rootCloudTop = mapContentHeight - height + ROOT_CLOUD_TOP_OFFSET;
  const rootTopY = rootCloudTop + rootCloudHeight - ROOT_BAND_TOP_INTO_CLOUD;
  const rootImageHeight = mapContentHeight - ROOT_IMAGE_BOTTOM_OFFSET - rootTopY;
  const rootImageTop = mapContentHeight - rootImageHeight - ROOT_IMAGE_BOTTOM_OFFSET;
  const bandLayouts: Array<{ cloudTop: number; bandBottom: number; bandTopY: number }> = [];

  for (let index = 0; index < treeBandCount; index += 1) {
    const cloudTop = index === 0 ? rootCloudTop : bandLayouts[index - 1].bandTopY - rootCloudHeight / 2;
    const bandBottomY = cloudTop + rootCloudHeight - TREE_BAND_BOTTOM_INTO_CLOUD;
    const bandTopY = bandBottomY - treeImageHeight;

    bandLayouts.push({
      cloudTop,
      bandBottom: mapContentHeight - bandBottomY,
      bandTopY,
    });
  }
  const minBandTop = bandLayouts.reduce((minTop, layout) => Math.min(minTop, layout.bandTopY, layout.cloudTop), rootImageTop);
  const topPadding = Math.max(0, -minBandTop);
  const scrollContentHeight = mapContentHeight + topPadding;
  const lockedRootViewportTop = Math.max(0, scrollContentHeight - height);
  const highestAccessibleTreeBandLayout =
    maxAccessibleBandIndex > 0 ? bandLayouts[Math.min(maxAccessibleBandIndex - 1, Math.max(0, bandLayouts.length - 1))] : null;
  const highestAccessibleViewportTop = highestAccessibleTreeBandLayout
    ? Math.max(0, highestAccessibleTreeBandLayout.bandTopY + topPadding - TREE_NEXT_BAND_PEEK)
    : lockedRootViewportTop;
  const allowedScrollContentHeight = Math.max(height, scrollContentHeight - highestAccessibleViewportTop);
  const maxAllowedScrollOffset = Math.max(0, allowedScrollContentHeight - height);
  const currentTreeBandLayoutIndex =
    effectiveCurrentBandIndex > 0
      ? Math.min(effectiveCurrentBandIndex - 1, Math.max(0, bandLayouts.length - 1))
      : -1;
  const currentTreeBandLayout = currentTreeBandLayoutIndex >= 0 ? bandLayouts[currentTreeBandLayoutIndex] : null;
  const initialViewportTop = completedLevelCountFromStart > 0
    ? currentTreeBandLayout
      ? Math.max(0, currentTreeBandLayout.bandTopY + topPadding - treeImageHeight * 0.12)
      : Math.max(0, rootCloudTop + topPadding - TREE_NEXT_BAND_PEEK)
    : lockedRootViewportTop;
  const initialScrollOffset = Math.max(
    0,
    Math.min(maxAllowedScrollOffset, initialViewportTop - highestAccessibleViewportTop),
  );

  useEffect(() => {
    screenWipe.setScreenReady();
  }, [screenWipe]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: initialScrollOffset, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset]);

  function animateReturnButton(value: number) {
    Animated.spring(returnScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  function handleCoinCounterPress() {
    // Reserved for a future shop route.
  }

  function handleOpenLevel(levelId: number) {
    void warmGameplayAssets();
    screenWipe.push(`/level/${levelId}`);
  }

  const mapContent = (
    <View
      style={{
        width,
        height: mapContentHeight,
        marginTop: topPadding,
        transform: [{ translateY: -highestAccessibleViewportTop }],
      }}
    >
      <Image
        source={treeMapRuntimeAssets.root}
        fadeDuration={0}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: (width - rootImageWidth) / 2,
          bottom: ROOT_IMAGE_BOTTOM_OFFSET,
          width: rootImageWidth,
          height: rootImageHeight,
          zIndex: 2,
        }}
      />
      {rootBand?.nodes.map((node) => {
        const socketLeft = (width - rootImageWidth) / 2 + node.anchor.x * rootImageWidth - TREE_SOCKET_SIZE / 2;
        const socketTop = rootImageTop + node.anchor.y * rootImageHeight - TREE_SOCKET_SIZE / 2 + ROOT_SOCKET_VERTICAL_OFFSET;

        return (
          <TreeSocket
            key={`root-band-level-${node.levelId}`}
            left={socketLeft}
            top={socketTop}
            levelId={node.levelId}
            fontsLoaded={fontsLoaded}
            locked={node.state === 'locked'}
            earnedStars={node.stars}
            completed={node.state === 'completed'}
            onPress={handleOpenLevel}
          />
        );
      })}
      {bandLayouts
        .slice()
        .reverse()
        .map((layout, reverseIndex) => {
          const treeBandIndex = bandLayouts.length - 1 - reverseIndex;
          const band = treeBands[treeBandIndex];

          return (
            <View key={`tree-band-${treeBandIndex + 1}`} pointerEvents="box-none">
              <Image
                source={treeMapRuntimeAssets.trunk}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  position: 'absolute',
                  left: (width - treeImageWidth) / 2,
                  top: layout.bandTopY,
                  width: treeImageWidth,
                  height: treeImageHeight,
                  zIndex: 3,
                }}
              />
              {band?.nodes.map((node) => {
                const socketLeft = (width - treeImageWidth) / 2 + node.anchor.x * treeImageWidth - TREE_SOCKET_SIZE / 2;
                const socketTop =
                  layout.bandTopY + node.anchor.y * treeImageHeight - TREE_SOCKET_SIZE / 2 + TREE_SOCKET_VERTICAL_OFFSET;
                return (
                  <TreeSocket
                    key={`tree-band-${treeBandIndex + 1}-level-${node.levelId}`}
                    left={socketLeft}
                    top={socketTop}
                    levelId={node.levelId}
                    fontsLoaded={fontsLoaded}
                    locked={node.state === 'locked'}
                    earnedStars={node.stars}
                    completed={node.state === 'completed'}
                    onPress={handleOpenLevel}
                  />
                );
              })}
            </View>
          );
        })}
      {previewBand ? (
        <View pointerEvents="none">
          <Image
            source={treeMapRuntimeAssets.trunk}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              left: (width - treeImageWidth) / 2,
              top: highestAccessibleTreeBandLayout
                ? highestAccessibleTreeBandLayout.bandTopY - rootCloudHeight / 2 + rootCloudHeight - TREE_BAND_BOTTOM_INTO_CLOUD - treeImageHeight
                : rootCloudTop + rootCloudHeight - TREE_BAND_BOTTOM_INTO_CLOUD - treeImageHeight,
              width: treeImageWidth,
              height: treeImageHeight,
              zIndex: 3,
              opacity: 0.9,
            }}
          />
        </View>
      ) : null}
      {bandLayouts.map((layout, bandIndex) => (
        <Image
          key={`tree-cloud-${bandIndex}`}
          source={treeMapRuntimeAssets.clouds}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            left: rootCloudLeft,
            top: layout.cloudTop,
            width: rootCloudWidth,
            height: rootCloudHeight,
            zIndex: 20 + bandIndex,
          }}
        />
      ))}
      {previewBand ? (
        <Image
          key="tree-cloud-preview"
          source={treeMapRuntimeAssets.clouds}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            left: rootCloudLeft,
            top: highestAccessibleTreeBandLayout
              ? highestAccessibleTreeBandLayout.bandTopY - rootCloudHeight / 2
              : rootCloudTop - rootCloudHeight / 2,
            width: rootCloudWidth,
            height: rootCloudHeight,
            zIndex: 20 + bandLayouts.length,
            opacity: 0.9,
          }}
        />
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ImageBackground source={treeMapRuntimeAssets.sky} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: allowedScrollContentHeight }}
        >
          {mapContent}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to chapters"
          onPress={() => screenWipe.replace('/chapters')}
          onPressIn={() => animateReturnButton(0.92)}
          onPressOut={() => animateReturnButton(1)}
          style={{
            position: 'absolute',
            top: RETURN_BUTTON_TOP,
            left: RETURN_BUTTON_LEFT,
            width: RETURN_BUTTON_SIZE,
            height: RETURN_BUTTON_SIZE,
            zIndex: 30,
          }}
        >
          <Animated.Image
            source={returnButtonImage}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              width: '100%',
              height: '100%',
              transform: [{ scale: returnScale }],
            }}
          />
        </Pressable>

        <CoinCounter coins={progress.wallet.coins} onPress={handleCoinCounterPress} />
      </ImageBackground>
    </View>
  );
}
