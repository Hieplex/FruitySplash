import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { useProgress } from '@/state/progress-store';
import { usePlaytestViewport } from '@/platform/playtest-viewport';
import { spacing } from '@/theme/spacing';

const settingsScreenImage = require('../../assets/fruity/Buttons/SettingScreen/ScreenSetting.png');
const settingsExitImage = require('../../assets/fruity/Buttons/SettingScreen/Exit.png');
const settingsHomeImage = require('../../assets/fruity/Buttons/SettingScreen/Home.png');
const settingsShakingImage = require('../../assets/fruity/Buttons/SettingScreen/Shaking.png');
const settingsSoundImage = require('../../assets/fruity/Buttons/SettingScreen/Sound.png');
const settingsVfxImage = require('../../assets/fruity/Buttons/SettingScreen/VFX.png');
const settingsVolumeBarImage = require('../../assets/fruity/Buttons/SettingScreen/volumebar.png');
const settingsVolumeActiveImage = require('../../assets/fruity/Buttons/SettingScreen/volumeactive.png');
const settingsVolumeThumbImage = require('../../assets/fruity/Buttons/SettingScreen/volumethumb.png');
const SETTINGS_PANEL_WIDTH_RATIO = 1;
const SETTINGS_PANEL_ASPECT_RATIO = 768 / 576;
const SETTINGS_PANEL_MAX_HEIGHT_RATIO = 0.7;
const SETTINGS_EXIT_BUTTON_SIZE_RATIO = 0.15;
const SETTINGS_EXIT_BUTTON_TOP_INSET_RATIO = 0.05;
const SETTINGS_EXIT_BUTTON_RIGHT_INSET_RATIO = 0.018;
const SETTINGS_BUTTON_SIZE_RATIO = 0.17;
const SETTINGS_SOUND_TOP_RATIO = 0.22;
const SETTINGS_VFX_TOP_RATIO = 0.423;
const SETTINGS_SHAKING_TOP_RATIO = 0.62;
const SETTINGS_HOME_TOP_RATIO = 0.62;
const SETTINGS_SOUND_X_RATIO = 0.2;
const SETTINGS_SOUND_SLIDER_X_RATIO = 0.4;
const SETTINGS_SOUND_SLIDER_TOP_RATIO = 0.1;
const SETTINGS_SOUND_SLIDER_WIDTH_RATIO = 0.3;
const SETTINGS_SOUND_PERCENT_X_RATIO = 0.73;
const SETTINGS_SOUND_PERCENT_TOP_RATIO = 0.29;
const SETTINGS_VFX_X_RATIO = 0.2;
const SETTINGS_VFX_SLIDER_X_RATIO = 0.4
const SETTINGS_VFX_SLIDER_TOP_RATIO = 0.30;
const SETTINGS_VFX_SLIDER_WIDTH_RATIO = 0.3;
const SETTINGS_VFX_PERCENT_X_RATIO = 0.73;
const SETTINGS_VFX_PERCENT_TOP_RATIO = 0.49;
const SETTINGS_SHAKING_X_RATIO = 0.3;
const SETTINGS_HOME_X_RATIO = 0.45;
const SETTINGS_LEFT_BUTTON_X_RATIO = SETTINGS_SOUND_X_RATIO;
const SETTINGS_RIGHT_BUTTON_X_RATIO = SETTINGS_HOME_X_RATIO;
const SETTINGS_SLIDER_TOUCH_HEIGHT_RATIO = 0.11;
const SETTINGS_SLIDER_TRACK_HEIGHT_RATIO = 0.35;
const SETTINGS_SLIDER_FILL_HEIGHT_RATIO = 0.25;
const SETTINGS_SLIDER_FILL_X_OFFSET_RATIO = -0.007;
const SETTINGS_SLIDER_FILL_Y_OFFSET_RATIO = -0.005;
const SETTINGS_SLIDER_FILL_RIGHT_BLEED_RATIO = 0.02;
const SETTINGS_SLIDER_THUMB_RIGHT_BLEED_RATIO = 0.02;
const SETTINGS_SLIDER_THUMB_HEIGHT_RATIO = 0.15;
const SETTINGS_SLIDER_PERCENT_GAP_RATIO = 0.0;
const SETTINGS_PERCENT_TEXT_COLOR = '#6A3313';

function safeResolveAssetSource(source: number) {
  if (typeof Image.resolveAssetSource !== 'function') {
    return null;
  }

  try {
    return Image.resolveAssetSource(source);
  } catch {
    return null;
  }
}

const settingsVolumeBarAsset = safeResolveAssetSource(settingsVolumeBarImage);
const settingsVolumeThumbAsset = safeResolveAssetSource(settingsVolumeThumbImage);
const SETTINGS_VOLUME_BAR_ASPECT_RATIO =
  settingsVolumeBarAsset?.width && settingsVolumeBarAsset?.height
    ? settingsVolumeBarAsset.width / settingsVolumeBarAsset.height
    : 4.8;
const SETTINGS_VOLUME_THUMB_ASPECT_RATIO =
  settingsVolumeThumbAsset?.width && settingsVolumeThumbAsset?.height
    ? settingsVolumeThumbAsset.width / settingsVolumeThumbAsset.height
    : 1;

type SettingsOverlayLayout = {
  width: number;
  height: number;
};

type SettingsOverlayProps = {
  visible: boolean;
  onClose: () => void;
  onGoHome: () => void;
  layout?: SettingsOverlayLayout;
};

function roundPixels(value: number) {
  return Math.round(value);
}

function scaledDimension(value: number, fallback = 1) {
  return Math.max(fallback, roundPixels(value));
}

function buildSettingsOverlayLayout(screenWidth: number, screenHeight: number): SettingsOverlayLayout {
  const maxWidthFromScreen = screenWidth * SETTINGS_PANEL_WIDTH_RATIO;
  const maxWidthFromHeight = screenHeight * SETTINGS_PANEL_MAX_HEIGHT_RATIO * SETTINGS_PANEL_ASPECT_RATIO;
  const width = scaledDimension(Math.min(maxWidthFromScreen, maxWidthFromHeight));
  const height = scaledDimension(width / SETTINGS_PANEL_ASPECT_RATIO);

  return { width, height };
}

function RoundActionButton({
  icon,
  label,
  enabled = true,
  left,
  top,
  size,
  onPress,
}: {
  icon: number;
  label: string;
  enabled?: boolean;
  left: number;
  top: number;
  size: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => animateTo(0.94)}
      onPressOut={() => animateTo(1)}
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        zIndex: 1,
      }}
    >
      <Animated.Image
        source={icon}
        fadeDuration={0}
        resizeMode="contain"
        style={{
          width: '100%',
          height: '100%',
          opacity: enabled ? 1 : 0.58,
          transform: [{ scale }],
        }}
      />
    </Pressable>
  );
}

function clampVolumeValue(value: number) {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function FruityVolumeSlider({
  left,
  top,
  width,
  overlayWidth,
  value,
  onValueChange,
  onSlidingStateChange,
  onSlidingComplete,
}: {
  left: number;
  top: number;
  width: number;
  overlayWidth: number;
  value: number;
  onValueChange: (value: number) => void;
  onSlidingStateChange?: (dragging: boolean) => void;
  onSlidingComplete?: (value: number) => void;
}) {
  const trackHeight = scaledDimension(overlayWidth * SETTINGS_SLIDER_TRACK_HEIGHT_RATIO);
  const fillHeight = scaledDimension(overlayWidth * SETTINGS_SLIDER_FILL_HEIGHT_RATIO);
  const thumbHeight = scaledDimension(overlayWidth * SETTINGS_SLIDER_THUMB_HEIGHT_RATIO);
  const thumbWidth = Math.max(thumbHeight, roundPixels(thumbHeight * SETTINGS_VOLUME_THUMB_ASPECT_RATIO));
  const thumbRightBleed = roundPixels(overlayWidth * SETTINGS_SLIDER_THUMB_RIGHT_BLEED_RATIO);
  const containerHeight = Math.max(
    trackHeight,
    fillHeight,
    thumbHeight,
    scaledDimension(overlayWidth * SETTINGS_SLIDER_TOUCH_HEIGHT_RATIO),
  );
  const normalizedValue = (clampVolumeValue(value) - 1) / 99;
  const travelWidth = Math.max(0, width - thumbWidth);
  const thumbLeft = normalizedValue >= 0.999 ? travelWidth + thumbRightBleed : travelWidth * normalizedValue;
  const trackTop = (containerHeight - trackHeight) / 2;
  const fillLeft = roundPixels(overlayWidth * SETTINGS_SLIDER_FILL_X_OFFSET_RATIO);
  const fillTop =
    (containerHeight - fillHeight) / 2 + roundPixels(overlayWidth * SETTINGS_SLIDER_FILL_Y_OFFSET_RATIO);
  const thumbTop = (containerHeight - thumbHeight) / 2;
  const thumbCenter = thumbLeft + thumbWidth / 2;
  const fillEnd = normalizedValue >= 0.999 ? width : thumbCenter;
  const fillWidth = Math.max(0, Math.min(width - fillLeft, fillEnd - fillLeft));
  const fillImageWidth = width + roundPixels(overlayWidth * SETTINGS_SLIDER_FILL_RIGHT_BLEED_RATIO);
  const touchLeft = -thumbWidth / 2;
  const touchWidth = width + thumbWidth;
  const touchHeight = scaledDimension(overlayWidth * SETTINGS_SLIDER_TOUCH_HEIGHT_RATIO);
  const touchTop = (containerHeight - touchHeight) / 2;

  function updateValueFromTouch(locationX: number) {
    const trackX = Math.max(0, Math.min(width, locationX - thumbWidth / 2));
    const nextValue = clampVolumeValue(1 + (trackX / width) * 99);

    onValueChange(nextValue);
    return nextValue;
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          onSlidingStateChange?.(true);
          updateValueFromTouch(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateValueFromTouch(event.nativeEvent.locationX);
        },
        onPanResponderRelease: (event) => {
          const finalValue = updateValueFromTouch(event.nativeEvent.locationX);
          onSlidingStateChange?.(false);
          onSlidingComplete?.(finalValue);
        },
        onPanResponderTerminate: (event) => {
          const finalValue = updateValueFromTouch(event.nativeEvent.locationX);
          onSlidingStateChange?.(false);
          onSlidingComplete?.(finalValue);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [onSlidingComplete, onSlidingStateChange, onValueChange, thumbWidth, width],
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: containerHeight,
        zIndex: 2,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: trackTop,
          width,
          height: trackHeight,
          justifyContent: 'center',
        }}
      >
        <Image
          source={settingsVolumeBarImage}
          fadeDuration={0}
          resizeMode="stretch"
          style={{
            width: '100%',
            height: '100%',
          }}
        />

        <View
          style={{
            position: 'absolute',
            left: fillLeft,
            top: fillTop - trackTop,
            width: fillWidth,
            height: fillHeight,
            overflow: 'hidden',
          }}
        >
          <Image
            source={settingsVolumeActiveImage}
            fadeDuration={0}
            resizeMode="stretch"
            style={{
              width: fillImageWidth,
              height: fillHeight,
            }}
          />
        </View>
      </View>

      <View pointerEvents="none">
        <Image
          source={settingsVolumeThumbImage}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            left: thumbLeft,
            top: thumbTop,
            width: thumbWidth,
            height: thumbHeight,
          }}
        />
      </View>

      <View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: touchLeft,
          top: touchTop,
          width: touchWidth,
          height: touchHeight,
          zIndex: 2,
        }}
      />
    </View>
  );
}

export function SettingsOverlay({ visible, onClose, onGoHome, layout }: SettingsOverlayProps) {
  const { width: screenWidth, height: screenHeight } = usePlaytestViewport();
  const overlayLayout = layout ?? buildSettingsOverlayLayout(screenWidth, screenHeight);
  const progress = useProgress();
  const [soundSliderValue, setSoundSliderValue] = useState(progress.soundVolumePercent);
  const [vfxSliderValue, setVfxSliderValue] = useState(progress.vfxVolumePercent);
  const [soundDragging, setSoundDragging] = useState(false);
  const [vfxDragging, setVfxDragging] = useState(false);
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitButtonSize = overlayLayout.width * SETTINGS_EXIT_BUTTON_SIZE_RATIO;
  const exitButtonTop = overlayLayout.height * SETTINGS_EXIT_BUTTON_TOP_INSET_RATIO;
  const exitButtonRight = overlayLayout.width * SETTINGS_EXIT_BUTTON_RIGHT_INSET_RATIO;
  const buttonSize = overlayLayout.width * SETTINGS_BUTTON_SIZE_RATIO;
  const soundLeft = overlayLayout.width * SETTINGS_SOUND_X_RATIO - buttonSize / 2;
  const vfxLeft = overlayLayout.width * SETTINGS_VFX_X_RATIO - buttonSize / 2;
  const shakingLeft = overlayLayout.width * SETTINGS_SHAKING_X_RATIO - buttonSize / 2;
  const homeLeft = overlayLayout.width * SETTINGS_HOME_X_RATIO - buttonSize / 2;
  const soundTop = overlayLayout.height * SETTINGS_SOUND_TOP_RATIO;
  const vfxTop = overlayLayout.height * SETTINGS_VFX_TOP_RATIO;
  const shakingTop = overlayLayout.height * SETTINGS_SHAKING_TOP_RATIO;
  const homeTop = overlayLayout.height * SETTINGS_HOME_TOP_RATIO;
  const soundPercentLeft = overlayLayout.width * SETTINGS_SOUND_PERCENT_X_RATIO;
  const vfxPercentLeft = overlayLayout.width * SETTINGS_VFX_PERCENT_X_RATIO;
  const soundSliderLeft =
    overlayLayout.width * SETTINGS_SOUND_SLIDER_X_RATIO -
    (overlayLayout.width * SETTINGS_SOUND_SLIDER_WIDTH_RATIO) / 2;
  const vfxSliderLeft =
    overlayLayout.width * SETTINGS_VFX_SLIDER_X_RATIO -
    (overlayLayout.width * SETTINGS_VFX_SLIDER_WIDTH_RATIO) / 2;
  const soundSliderWidth = Math.max(
    1,
    soundPercentLeft - overlayLayout.width * SETTINGS_SLIDER_PERCENT_GAP_RATIO - soundSliderLeft,
  );
  const vfxSliderWidth = Math.max(
    1,
    vfxPercentLeft - overlayLayout.width * SETTINGS_SLIDER_PERCENT_GAP_RATIO - vfxSliderLeft,
  );

  useEffect(() => {
    if (!soundDragging) {
      setSoundSliderValue(progress.soundVolumePercent);
    }
  }, [progress.soundVolumePercent, soundDragging]);

  useEffect(() => {
    if (!vfxDragging) {
      setVfxSliderValue(progress.vfxVolumePercent);
    }
  }, [progress.vfxVolumePercent, vfxDragging]);

  function animateExit(toValue: number) {
    Animated.spring(exitScale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            width: overlayLayout.width,
            height: overlayLayout.height,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 0,
            }}
          >
            <Image
              source={settingsScreenImage}
              fadeDuration={0}
              resizeMode="contain"
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </View>
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              inset: 0,
            }}
          >
            <RoundActionButton
              icon={settingsSoundImage}
              label={`Sound ${progress.soundEnabled ? 'on' : 'off'}`}
              enabled={progress.soundEnabled}
              left={soundLeft}
              top={soundTop}
              size={buttonSize}
              onPress={() => progress.setSoundEnabled(!progress.soundEnabled)}
            />

            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: soundPercentLeft,
                top: overlayLayout.height * SETTINGS_SOUND_PERCENT_TOP_RATIO,
                zIndex: 1,
                color: SETTINGS_PERCENT_TEXT_COLOR,
                fontSize: Math.max(16, roundPixels(overlayLayout.width * 0.04)),
                fontWeight: '900',
              }}
            >
              {`${soundSliderValue}%`}
            </Text>

            <RoundActionButton
              icon={settingsVfxImage}
              label={`VFX ${progress.vfxEnabled ? 'on' : 'off'}`}
              enabled={progress.vfxEnabled}
              left={vfxLeft}
              top={vfxTop}
              size={buttonSize}
              onPress={() => progress.setVfxEnabled(!progress.vfxEnabled)}
            />

            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: vfxPercentLeft,
                top: overlayLayout.height * SETTINGS_VFX_PERCENT_TOP_RATIO,
                zIndex: 1,
                color: SETTINGS_PERCENT_TEXT_COLOR,
                fontSize: Math.max(16, roundPixels(overlayLayout.width * 0.04)),
                fontWeight: '900',
              }}
            >
              {`${vfxSliderValue}%`}
            </Text>

            <RoundActionButton
              icon={settingsShakingImage}
              label={`Shaking ${progress.shakingEnabled ? 'on' : 'off'}`}
              enabled={progress.shakingEnabled}
              left={shakingLeft}
              top={shakingTop}
              size={buttonSize}
              onPress={() => progress.setShakingEnabled(!progress.shakingEnabled)}
            />

            <RoundActionButton
              icon={settingsHomeImage}
              label="Go home"
              left={homeLeft}
              top={homeTop}
              size={buttonSize}
              onPress={onGoHome}
            />

            <FruityVolumeSlider
              left={soundSliderLeft}
              top={overlayLayout.height * SETTINGS_SOUND_SLIDER_TOP_RATIO}
              width={soundSliderWidth}
              overlayWidth={overlayLayout.width}
              value={soundSliderValue}
              onValueChange={setSoundSliderValue}
              onSlidingStateChange={setSoundDragging}
              onSlidingComplete={progress.setSoundVolumePercent}
            />

            <FruityVolumeSlider
              left={vfxSliderLeft}
              top={overlayLayout.height * SETTINGS_VFX_SLIDER_TOP_RATIO}
              width={vfxSliderWidth}
              overlayWidth={overlayLayout.width}
              value={vfxSliderValue}
              onValueChange={setVfxSliderValue}
              onSlidingStateChange={setVfxDragging}
              onSlidingComplete={progress.setVfxVolumePercent}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close settings"
              onPress={onClose}
              onPressIn={() => animateExit(0.92)}
              onPressOut={() => animateExit(1)}
              style={{
                position: 'absolute',
                top: exitButtonTop,
                right: exitButtonRight,
                width: exitButtonSize,
                height: exitButtonSize,
                zIndex: 3,
              }}
            >
              <Animated.Image
                source={settingsExitImage}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [{ scale: exitScale }],
                }}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
