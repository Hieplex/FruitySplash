import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { Animated, Image, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { AvatarFrameButton } from '@/components/avatar-frame-button';
import { ChapterFruitRain } from '@/components/chapter-fruit-rain';
import { ShopOverlay } from '@/components/shop-overlay';
import { SettingsOverlay } from '@/components/settings-overlay';
import { warmGameplayAssets, warmTreeMapAssets } from '@/game/assets/preload-assets.native';
import { barRuntimeAssets, challengeRuntimeAssets, treeMapRuntimeAssets, uiRuntimeAssets } from '@/game/assets/runtime-assets';
import { getTreeBandIndexForLevel, TREE_LEVELS_PER_BAND } from '@/navigation/tree-map-model';
import { buildTreeMapViewModel } from '@/navigation/tree-map-view-model';
import { usePlaytestViewport } from '@/platform/playtest-viewport';
import { useGoogleAuth } from '@/state/google-auth';
import { getCompletedLevelCountFromStart, getLastCompletedLevelIdFromStart, MAX_WALLET_COINS } from '@/state/progress-helpers';
import { useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';

const ACCOUNT_BOX_TOP = 0;
const ACCOUNT_BOX_LEFT = 0;
const ACCOUNT_BOX_SIZE = 75;

const RESOURCE_HEADER_HEIGHT = 88;
const RESOURCE_HEADER_RADIUS = 22;
const RESOURCE_PANEL_WIDTH = 140;
const RESOURCE_PANEL_HEIGHT = 30;
const RESOURCE_PANEL_RADIUS = 14;
const RESOURCE_PANEL_ICON_SIZE = 50;
const RESOURCE_PANEL_INNER_LEFT = 18;
const RESOURCE_PANEL_INNER_RIGHT = 12;
const RESOURCE_TEXT_OFFSET_X = 10;
const RESOURCE_TEXT_COLOR = '#F7FFF8';
const RESOURCE_TEXT_OUTLINE = '#050203';
const RESOURCE_TEXT_OUTLINE_OFFSET = 1;
const RESOURCE_TEXT_WEIGHT = '900';
const RESOURCE_LEFT_PANEL_X = 90;
const RESOURCE_LEFT_PANEL_Y = 50;
const RESOURCE_RIGHT_PANEL_X = 90;
const RESOURCE_RIGHT_PANEL_Y = 50;
const RESOURCE_SETTINGS_BUTTON_SIZE = 42;
const RESOURCE_SETTINGS_BUTTON_GAP = 8;
const RESOURCE_SHOP_BUTTON_SIZE = 80;
const RESOURCE_SHOP_BUTTON_RIGHT = 10;
const RESOURCE_SHOP_BUTTON_TOP = 100;

const ROOT_IMAGE_WIDTH_RATIO = 1.4;
const ROOT_IMAGE_X_OFFSET = 0;
const ROOT_IMAGE_Y_OFFSET = 0;
const ROOT_IMAGE_BOTTOM_OFFSET = -100;
const ROOT_BAND_TOP_INTO_CLOUD = 80;


const TREE_IMAGE_WIDTH_RATIO = 1.3;
const TREE_IMAGE_HEIGHT_RATIO = 1;
const TREE_IMAGE_X_OFFSET = 0;
const TREE_IMAGE_Y_OFFSET = 0;
const TREE_BAND_BOTTOM_INTO_CLOUD = 30;
const ROOT_CLOUD_WIDTH_RATIO = 1.2;
const ROOT_CLOUD_ASPECT_RATIO = 3;
const ROOT_CLOUD_TOP_OFFSET = 0;
const TREE_TEST_BAND_SCROLL_HEIGHT_RATIO = 0.9;
const TREE_TEST_MAX_LEVEL = 200;
const TREE_REVEAL_BAND_COUNT = 1;
const TREE_SOCKET_SIZE = 74.88;
const TREE_SOCKET_NUMBER_COLOR = '#FFFFFF';
const TREE_SOCKET_NUMBER_OUTLINE = '#000000';
const TREE_SOCKET_NUMBER_OUTLINE_OFFSET = 1;
const TREE_NEXT_BAND_PEEK = 240;
const ROOT_SOCKET_VERTICAL_OFFSET = -55;
const TREE_SOCKET_VERTICAL_OFFSET = 0;
const SOCKET_STAR_SIZE = 49.92;
const SOCKET_STAR_Y_OFFSETS = [-12.48, -26, -12.48] as const;
const SOCKET_STAR_X_OFFSETS = [-29.12, 0, 29.12] as const;
const SOCKET_STAR_ARC_TOP_OFFSET = -14.56;
const SOCKET_STAR_REVEAL_DELAY_MS = 180;
const SOCKET_STAR_REVEAL_DURATION_MS = 280;
const SOCKET_FOCUS_VIEWPORT_RATIO = 0.42;
const shopButtonImage = require('../assets/Shop/ShopIcon.png');
const MAP_DESIGN_WIDTH = 540;
const MAP_DESIGN_HEIGHT = 1170;

function scaleDesign(value: number, scale: number) {
  return Math.round(value * scale);
}

function SocketFillStar({
  levelId,
  index,
  isEarned,
  deferStarUpdate,
  animateStarUpdate,
  scale: designScale,
}: {
  levelId: number;
  index: number;
  isEarned: boolean;
  deferStarUpdate?: boolean;
  animateStarUpdate?: boolean;
  scale: number;
}) {
  const fillProgress = useRef(new Animated.Value(isEarned && !deferStarUpdate ? 1 : 0)).current;
  const popScale = useRef(new Animated.Value(1)).current;
  const starSize = scaleDesign(SOCKET_STAR_SIZE, designScale);
  const starOffsetX = scaleDesign(SOCKET_STAR_X_OFFSETS[index], designScale);
  const starOffsetY = scaleDesign(SOCKET_STAR_Y_OFFSETS[index], designScale);

  useEffect(() => {
    fillProgress.stopAnimation();
    popScale.stopAnimation();

    if (!isEarned) {
      fillProgress.setValue(0);
      popScale.setValue(0.9);
      return;
    }

    if (deferStarUpdate && !animateStarUpdate) {
      fillProgress.setValue(0);
      popScale.setValue(0.45);
      return;
    }

    if (!animateStarUpdate) {
      fillProgress.setValue(1);
      popScale.setValue(1);
      return;
    }

    const delayMs = index * SOCKET_STAR_REVEAL_DELAY_MS;
    fillProgress.setValue(0);
    popScale.setValue(0.88);

    Animated.parallel([
      Animated.timing(fillProgress, {
        toValue: 1,
        duration: SOCKET_STAR_REVEAL_DURATION_MS * 2.4,
        delay: delayMs,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(delayMs + 120),
        Animated.spring(popScale, {
          toValue: 1.08,
          useNativeDriver: true,
          speed: 18,
          bounciness: 9,
        }),
        Animated.spring(popScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 6,
        }),
      ]),
    ]).start();
  }, [animateStarUpdate, deferStarUpdate, fillProgress, index, isEarned, popScale]);

  return (
    <Animated.View
      key={`${levelId}-earned-star-${index}`}
      style={{
        position: 'absolute',
        left: '50%',
        marginLeft: -starSize / 2 + starOffsetX,
        top: starOffsetY,
        width: starSize,
        height: starSize,
        transform: [{ scale: popScale }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: fillProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, starSize],
          }),
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: starSize,
          }}
        >
          <Image
            source={barRuntimeAssets.fullStar}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              inset: 0,
              width: starSize,
              height: starSize,
            }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function TreeSocket({
  left,
  top,
  levelId,
  fontsLoaded,
  locked,
  earnedStars,
  deferStarUpdate,
  animateStarUpdate,
  completed,
  onPress,
  scale: designScale,
}: {
  left: number;
  top: number;
  levelId: number;
  fontsLoaded: boolean;
  locked: boolean;
  earnedStars: number;
  deferStarUpdate?: boolean;
  animateStarUpdate?: boolean;
  completed: boolean;
  onPress: (levelId: number) => void;
  scale: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const displayStars = Math.max(0, Math.min(3, Math.floor(earnedStars)));
  const socketSize = scaleDesign(TREE_SOCKET_SIZE, designScale);
  const starSize = scaleDesign(SOCKET_STAR_SIZE, designScale);
  const starArcTopOffset = scaleDesign(SOCKET_STAR_ARC_TOP_OFFSET, designScale);
  const starXOffsets = SOCKET_STAR_X_OFFSETS.map((offset) => scaleDesign(offset, designScale));
  const starYOffsets = SOCKET_STAR_Y_OFFSETS.map((offset) => scaleDesign(offset, designScale));
  const textSize = scaleDesign(levelId >= 100 ? 18 : levelId >= 10 ? 22 : 26, designScale);
  const textLineHeight = scaleDesign(levelId >= 100 ? 20 : levelId >= 10 ? 24 : 28, designScale);
  const numberOutlineOffset = Math.max(1, scaleDesign(TREE_SOCKET_NUMBER_OUTLINE_OFFSET, designScale));
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
        width: socketSize,
        height: socketSize,
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
            top: starArcTopOffset,
            left: 0,
            right: 0,
            zIndex: 2,
            height: starSize + scaleDesign(12, designScale),
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
                marginLeft: -starSize / 2 + starXOffsets[index],
                top: starYOffsets[index],
                width: starSize,
                height: starSize,
                opacity: completed || earnedStars > 0 ? 0.95 : 0.82,
              }}
            />
          ))}
          {Array.from({ length: 3 }, (_, index) => (
            <SocketFillStar
              key={`${levelId}-earned-star-${index}`}
              levelId={levelId}
              index={index}
              isEarned={index < displayStars}
              deferStarUpdate={deferStarUpdate}
              animateStarUpdate={animateStarUpdate}
              scale={designScale}
            />
          ))}
        </View>
        <Image
          source={treeMapRuntimeAssets.socket}
          fadeDuration={0}
          resizeMode="contain"
          style={{ width: socketSize, height: socketSize }}
        />
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          {[
            [-numberOutlineOffset, 0],
            [numberOutlineOffset, 0],
            [0, -numberOutlineOffset],
            [0, numberOutlineOffset],
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

function formatCoinCount(coins: number) {
  return String(Math.max(0, Math.min(MAX_WALLET_COINS, Math.floor(coins))));
}

function ResourcePanel({
  icon,
  value,
  scale,
}: {
  icon: number;
  value: string;
  scale: number;
}) {
  const panelWidth = scaleDesign(RESOURCE_PANEL_WIDTH, scale);
  const panelHeight = scaleDesign(RESOURCE_PANEL_HEIGHT, scale);
  const panelRadius = scaleDesign(RESOURCE_PANEL_RADIUS, scale);
  const panelIconSize = scaleDesign(RESOURCE_PANEL_ICON_SIZE, scale);
  const panelInnerLeft = scaleDesign(RESOURCE_PANEL_INNER_LEFT, scale);
  const panelInnerRight = scaleDesign(RESOURCE_PANEL_INNER_RIGHT, scale);
  const textOffsetX = scaleDesign(RESOURCE_TEXT_OFFSET_X, scale);
  const textOutlineOffset = Math.max(1, scaleDesign(RESOURCE_TEXT_OUTLINE_OFFSET, scale));
  const textSize = scaleDesign(16, scale);
  const textLineHeight = scaleDesign(18, scale);

  return (
    <View
      accessibilityLabel={value}
      style={{
        width: panelWidth,
        height: panelHeight,
        justifyContent: 'center',
      }}
    >
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: panelRadius,
            backgroundColor: 'rgba(26, 41, 58, 0.8)',
            borderWidth: 1,
            borderColor: 'rgba(208, 237, 255, 0.38)',
            boxShadow: '0 2px 8px rgba(26, 41, 58, 0.22)',
            overflow: 'hidden',
          }}
        >
        <View
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: panelRadius - 1,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.16)',
          }}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: scaleDesign(-5, scale),
          width: panelIconSize,
          height: panelIconSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={icon}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            width: panelIconSize,
            height: panelIconSize,
          }}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: panelInnerLeft,
          right: panelInnerRight,
          top: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ translateX: textOffsetX }],
        }}
      >
        <View pointerEvents="none" style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {[
            [-textOutlineOffset, 0],
            [textOutlineOffset, 0],
            [0, -textOutlineOffset],
            [0, textOutlineOffset],
          ].map(([x, y], index) => (
            <Text
              key={`${value}-outline-${index}`}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                position: 'absolute',
                width: '100%',
                color: RESOURCE_TEXT_OUTLINE,
                fontSize: textSize,
                lineHeight: textLineHeight,
                fontWeight: RESOURCE_TEXT_WEIGHT,
                textAlign: 'center',
                fontVariant: ['tabular-nums'],
                transform: [{ translateX: x }, { translateY: y }],
              }}
            >
              {value}
            </Text>
          ))}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{
              width: '100%',
              color: RESOURCE_TEXT_COLOR,
              fontSize: textSize,
              lineHeight: textLineHeight,
              fontWeight: RESOURCE_TEXT_WEIGHT,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
            }}
          >
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams<{
    animateLevel?: string;
    stars?: string;
  }>();
  const { width, height } = usePlaytestViewport();
  const [fontsLoaded] = useFonts({
    SuperChiby: require('../assets/Fonts/super-chiby-font/SuperChiby-BL62V.ttf'),
    NunitoSansVariable: require('../assets/Fonts/Nunito_Sans/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf'),
  });
  const screenWipe = useScreenWipe();
  const progress = useProgress();
  const googleAuth = useGoogleAuth();
  const [shouldAnimateMapStars, setShouldAnimateMapStars] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showShopOverlay, setShowShopOverlay] = useState(false);
  const [openingLevelId, setOpeningLevelId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const accountScale = useRef(new Animated.Value(1)).current;
  const settingsButtonScale = useRef(new Animated.Value(1)).current;
  const shopButtonScale = useRef(new Animated.Value(1)).current;
  const mapScale = width / MAP_DESIGN_WIDTH;
  const accountBoxTop = scaleDesign(ACCOUNT_BOX_TOP, mapScale);
  const accountBoxLeft = scaleDesign(ACCOUNT_BOX_LEFT, mapScale);
  const accountBoxSize = scaleDesign(ACCOUNT_BOX_SIZE, mapScale);
  const resourceHeaderHeight = scaleDesign(RESOURCE_HEADER_HEIGHT, mapScale);
  const resourceHeaderRadius = scaleDesign(RESOURCE_HEADER_RADIUS, mapScale);
  const resourcePanelHeight = scaleDesign(RESOURCE_PANEL_HEIGHT, mapScale);
  const resourceLeftPanelX = scaleDesign(RESOURCE_LEFT_PANEL_X, mapScale);
  const resourceLeftPanelY = scaleDesign(RESOURCE_LEFT_PANEL_Y, mapScale);
  const resourceRightPanelX = scaleDesign(RESOURCE_RIGHT_PANEL_X, mapScale);
  const resourceRightPanelY = scaleDesign(RESOURCE_RIGHT_PANEL_Y, mapScale);
  const resourceSettingsButtonSize = scaleDesign(RESOURCE_SETTINGS_BUTTON_SIZE, mapScale);
  const resourceSettingsButtonGap = scaleDesign(RESOURCE_SETTINGS_BUTTON_GAP, mapScale);
  const resourceShopButtonSize = scaleDesign(RESOURCE_SHOP_BUTTON_SIZE, mapScale);
  const resourceShopButtonRight = scaleDesign(RESOURCE_SHOP_BUTTON_RIGHT, mapScale);
  const resourceShopButtonTop = scaleDesign(RESOURCE_SHOP_BUTTON_TOP, mapScale);
  const socketSize = scaleDesign(TREE_SOCKET_SIZE, mapScale);
  const rootImageXOffset = scaleDesign(ROOT_IMAGE_X_OFFSET, mapScale);
  const rootImageYOffset = scaleDesign(ROOT_IMAGE_Y_OFFSET, mapScale);
  const rootImageBottomOffset = scaleDesign(ROOT_IMAGE_BOTTOM_OFFSET, mapScale);
  const rootBandTopIntoCloud = scaleDesign(ROOT_BAND_TOP_INTO_CLOUD, mapScale);
  const treeImageXOffset = scaleDesign(TREE_IMAGE_X_OFFSET, mapScale);
  const treeImageYOffset = scaleDesign(TREE_IMAGE_Y_OFFSET, mapScale);
  const treeBandBottomIntoCloud = scaleDesign(TREE_BAND_BOTTOM_INTO_CLOUD, mapScale);
  const rootCloudTopOffset = scaleDesign(ROOT_CLOUD_TOP_OFFSET, mapScale);
  const treeNextBandPeek = scaleDesign(TREE_NEXT_BAND_PEEK, mapScale);
  const rootSocketVerticalOffset = scaleDesign(ROOT_SOCKET_VERTICAL_OFFSET, mapScale);
  const treeSocketVerticalOffset = scaleDesign(TREE_SOCKET_VERTICAL_OFFSET, mapScale);
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
  const rootImageWidth = MAP_DESIGN_WIDTH * ROOT_IMAGE_WIDTH_RATIO * mapScale;
  const treeImageWidth = MAP_DESIGN_WIDTH * TREE_IMAGE_WIDTH_RATIO * mapScale;
  const treeImageHeight = MAP_DESIGN_HEIGHT * TREE_IMAGE_HEIGHT_RATIO * mapScale;
  const extraScrollHeight = treeImageHeight * TREE_TEST_BAND_SCROLL_HEIGHT_RATIO * treeBandCount;
  const mapContentHeight = height + extraScrollHeight;
  const rootCloudWidth = MAP_DESIGN_WIDTH * ROOT_CLOUD_WIDTH_RATIO * mapScale;
  const rootCloudHeight = rootCloudWidth / ROOT_CLOUD_ASPECT_RATIO;
  const rootCloudLeft = (width - rootCloudWidth) / 2;
  const rootCloudTop = mapContentHeight - height + rootCloudTopOffset;
  const rootTopY = rootCloudTop + rootCloudHeight - rootBandTopIntoCloud + rootImageYOffset;
  const rootImageHeight = mapContentHeight - rootImageBottomOffset - rootTopY;
  const rootImageTop = rootTopY;
  const bandLayouts: Array<{ cloudTop: number; bandBottom: number; bandTopY: number }> = [];
  const animatedLevelId = Math.max(0, Math.floor(Number(params.animateLevel ?? 0)));
  const animatedStarCount = Math.max(0, Math.min(3, Math.floor(Number(params.stars ?? 0))));
  for (let index = 0; index < treeBandCount; index += 1) {
    const cloudTop = index === 0 ? rootCloudTop : bandLayouts[index - 1].bandTopY - rootCloudHeight / 2;
    const bandBottomY = cloudTop + rootCloudHeight - treeBandBottomIntoCloud;
    const bandTopY = bandBottomY - treeImageHeight + treeImageYOffset;

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
    ? Math.max(0, highestAccessibleTreeBandLayout.bandTopY + topPadding - treeNextBandPeek)
    : lockedRootViewportTop;
  const allowedScrollContentHeight = Math.max(height, scrollContentHeight - highestAccessibleViewportTop);
  const maxAllowedScrollOffset = Math.max(0, allowedScrollContentHeight - height);
  const currentTreeBandLayoutIndex =
    effectiveCurrentBandIndex > 0
      ? Math.min(effectiveCurrentBandIndex - 1, Math.max(0, bandLayouts.length - 1))
      : -1;
  const currentTreeBandLayout = currentTreeBandLayoutIndex >= 0 ? bandLayouts[currentTreeBandLayoutIndex] : null;
  const focusedLevelId = animatedLevelId > 0 ? animatedLevelId : 0;
  const focusedBandIndex = focusedLevelId > 0 ? getTreeBandIndexForLevel(focusedLevelId) : -1;
  const focusedBand = focusedBandIndex >= 0 ? visibleBands[focusedBandIndex] : null;
  const focusedNode = focusedBand?.nodes.find((node) => node.levelId === focusedLevelId) ?? null;
  const focusedSocketTop =
    focusedNode && focusedBandIndex === 0
      ? rootImageTop + focusedNode.anchor.y * rootImageHeight - socketSize / 2 + rootSocketVerticalOffset
      : focusedNode && focusedBandIndex > 0
        ? (() => {
            const layout = bandLayouts[focusedBandIndex - 1];
            return layout
              ? layout.bandTopY + focusedNode.anchor.y * treeImageHeight - socketSize / 2 + treeSocketVerticalOffset
              : null;
          })()
        : null;
  const focusedViewportTop =
    focusedSocketTop === null ? null : Math.max(0, focusedSocketTop + topPadding - height * SOCKET_FOCUS_VIEWPORT_RATIO);
  const progressViewportTop = completedLevelCountFromStart > 0
    ? currentTreeBandLayout
      ? Math.max(0, currentTreeBandLayout.bandTopY + topPadding - treeImageHeight * 0.12)
      : Math.max(0, rootCloudTop + topPadding - treeNextBandPeek)
    : lockedRootViewportTop;
  const initialViewportTop = focusedViewportTop ?? progressViewportTop;
  const initialScrollOffset = Math.max(
    0,
    Math.min(maxAllowedScrollOffset, initialViewportTop - highestAccessibleViewportTop),
  );

  useEffect(() => {
    setShouldAnimateMapStars(false);

    if (!fontsLoaded) {
      return undefined;
    }

    let cancelled = false;
    void warmTreeMapAssets().finally(() => {
      if (!cancelled) {
        screenWipe.setScreenReady();
      }
    });

    const timer = setTimeout(() => {
      setShouldAnimateMapStars(true);
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [animatedLevelId, animatedStarCount, fontsLoaded, screenWipe]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: initialScrollOffset, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset]);

  function animateAccountBox(value: number) {
    Animated.spring(accountScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  function animateSettingsButton(value: number) {
    Animated.spring(settingsButtonScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  function animateShopButton(value: number) {
    Animated.spring(shopButtonScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  function handleAccountPress() {
    if (googleAuth.user) {
      void googleAuth.signOut();
      return;
    }

    void googleAuth.signIn();
  }

  async function handleOpenLevel(levelId: number) {
    if (openingLevelId !== null) {
      return;
    }

    setOpeningLevelId(levelId);
    const energySpent = await progress.spendLevelEnergy();
    if (!energySpent) {
      setOpeningLevelId(null);
      return;
    }

    void warmGameplayAssets();
    screenWipe.push(`/level/${levelId}`);
  }

  function handleOpenSettings() {
    setShowSettingsOverlay(true);
  }

  function handleOpenShop() {
    setShowShopOverlay(true);
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
          left: (width - rootImageWidth) / 2 + rootImageXOffset,
          bottom: rootImageBottomOffset,
          width: rootImageWidth,
          height: rootImageHeight,
          zIndex: 2,
        }}
      />
      {rootBand?.nodes.map((node) => {
        const socketLeft =
          (width - rootImageWidth) / 2 + rootImageXOffset + node.anchor.x * rootImageWidth - socketSize / 2;
        const socketTop = rootImageTop + node.anchor.y * rootImageHeight - socketSize / 2 + rootSocketVerticalOffset;

        return (
          <TreeSocket
            key={`root-band-level-${node.levelId}`}
            left={socketLeft}
            top={socketTop}
            levelId={node.levelId}
            fontsLoaded={fontsLoaded}
            locked={node.state === 'locked'}
            earnedStars={node.stars}
            deferStarUpdate={node.levelId === animatedLevelId && animatedStarCount > 0 && animatedStarCount >= node.stars}
            animateStarUpdate={
              shouldAnimateMapStars && node.levelId === animatedLevelId && animatedStarCount > 0 && animatedStarCount >= node.stars
            }
            completed={node.state === 'completed'}
            onPress={handleOpenLevel}
            scale={mapScale}
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
                  left: (width - treeImageWidth) / 2 + treeImageXOffset,
                  top: layout.bandTopY,
                  width: treeImageWidth,
                  height: treeImageHeight,
                  zIndex: 3,
                }}
              />
              {band?.nodes.map((node) => {
                const socketLeft =
                  (width - treeImageWidth) / 2 + treeImageXOffset + node.anchor.x * treeImageWidth - socketSize / 2;
                const socketTop =
                  layout.bandTopY + node.anchor.y * treeImageHeight - socketSize / 2 + treeSocketVerticalOffset;
                return (
                  <TreeSocket
                    key={`tree-band-${treeBandIndex + 1}-level-${node.levelId}`}
                    left={socketLeft}
                    top={socketTop}
                    levelId={node.levelId}
                    fontsLoaded={fontsLoaded}
                    locked={node.state === 'locked'}
                    earnedStars={node.stars}
                    deferStarUpdate={node.levelId === animatedLevelId && animatedStarCount > 0 && animatedStarCount >= node.stars}
                    animateStarUpdate={
                      shouldAnimateMapStars &&
                      node.levelId === animatedLevelId &&
                      animatedStarCount > 0 &&
                      animatedStarCount >= node.stars
                    }
                    completed={node.state === 'completed'}
                    onPress={handleOpenLevel}
                    scale={mapScale}
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
              left: (width - treeImageWidth) / 2 + treeImageXOffset,
              top: highestAccessibleTreeBandLayout
                ? highestAccessibleTreeBandLayout.bandTopY - rootCloudHeight / 2 + rootCloudHeight - treeBandBottomIntoCloud - treeImageHeight + treeImageYOffset
                : rootCloudTop + rootCloudHeight - treeBandBottomIntoCloud - treeImageHeight + treeImageYOffset,
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
        <ChapterFruitRain width={width} height={height} />
        <ScrollView
          ref={scrollRef}
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: allowedScrollContentHeight }}
        >
          {mapContent}
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            top: accountBoxTop,
            left: accountBoxLeft,
            right: accountBoxLeft,
            zIndex: 30,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width,
              height: resourceHeaderHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                borderRadius: resourceHeaderRadius,
                backgroundColor: '#A5DBFF',
                borderWidth: 0,
                boxShadow: '0 6px 18px rgba(66, 132, 184, 0.2)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#D6EEFF',
                }}
              />
              {Array.from({ length: 12 }, (_, index) => (
                <View
                  key={`header-pattern-${index}`}
                  style={{
                    position: 'absolute',
                    top: scaleDesign(-44, mapScale),
                    left: scaleDesign(index * 62 - 120, mapScale),
                    width: scaleDesign(28, mapScale),
                    height: resourceHeaderHeight * 2.2,
                    backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.045)',
                    transform: [{ rotate: '28deg' }],
                  }}
                />
              ))}
              <View
                style={{
                  position: 'absolute',
                  inset: 2,
                  borderRadius: resourceHeaderRadius - 2,
                  borderWidth: 0,
                }}
              />
            </View>

            <View
              style={{
                position: 'absolute',
                left: resourceLeftPanelX,
                top: resourceLeftPanelY,
              }}
            >
              <ResourcePanel
                icon={treeMapRuntimeAssets.resourceEnergyIcon}
                value={`${progress.lives.current}/${progress.lives.max}`}
                scale={mapScale}
              />
            </View>

            <View
              style={{
                position: 'absolute',
                right: resourceRightPanelX,
                top: resourceRightPanelY,
              }}
            >
              <ResourcePanel
                icon={treeMapRuntimeAssets.resourceCoinIcon}
                value={formatCoinCount(progress.wallet.coins)}
                scale={mapScale}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={handleOpenSettings}
              onPressIn={() => animateSettingsButton(0.92)}
              onPressOut={() => animateSettingsButton(1)}
              style={{
                position: 'absolute',
                right: resourceRightPanelX - resourceSettingsButtonSize - resourceSettingsButtonGap,
                top: resourceRightPanelY + (resourcePanelHeight - resourceSettingsButtonSize) / 2,
                width: resourceSettingsButtonSize,
                height: resourceSettingsButtonSize,
                zIndex: 2,
              }}
            >
              <Animated.Image
                source={uiRuntimeAssets.buttonSettings}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [{ scale: settingsButtonScale }],
                }}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open shop"
              onPress={handleOpenShop}
              onPressIn={() => animateShopButton(0.92)}
              onPressOut={() => animateShopButton(1)}
              style={{
                position: 'absolute',
                right: resourceShopButtonRight,
                top: resourceShopButtonTop,
                width: resourceShopButtonSize,
                height: resourceShopButtonSize,
                zIndex: 2,
              }}
            >
              <Animated.Image
                source={shopButtonImage}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [{ scale: shopButtonScale }],
                }}
              />
            </Pressable>

            <View
              style={{
                position: 'absolute',
                top: scaleDesign(35, mapScale),
                alignSelf: 'center',
              }}
            >
              <AvatarFrameButton
                accessibilityLabel={googleAuth.user ? 'Sign out of Google' : 'Sign in with Google'}
                fallbackLabel="G"
                imageUri={googleAuth.user?.photo}
                loading={googleAuth.loading}
                error={Boolean(googleAuth.error)}
                scale={accountScale}
                onPress={handleAccountPress}
                onPressIn={() => animateAccountBox(0.92)}
                onPressOut={() => animateAccountBox(1)}
                size={accountBoxSize}
              />
            </View>
          </View>
        </View>
        <SettingsOverlay
          visible={showSettingsOverlay}
          onClose={() => setShowSettingsOverlay(false)}
          onGoHome={() => {
            setShowSettingsOverlay(false);
            screenWipe.replace('/map');
          }}
        />
        <ShopOverlay
          visible={showShopOverlay}
          onClose={() => setShowShopOverlay(false)}
          screenWidth={width}
          screenHeight={height}
        />
      </ImageBackground>
    </View>
  );
}
