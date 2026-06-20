import { Platform, useWindowDimensions } from 'react-native';

export const WEB_PLAYTEST_MAX_WIDTH = 430;
export const WEB_PLAYTEST_ASPECT_RATIO = 430 / 932;

export function getWebPlaytestFrame({ width, height }: { width: number; height: number }) {
  const frameWidth = Math.min(width, WEB_PLAYTEST_MAX_WIDTH, height * WEB_PLAYTEST_ASPECT_RATIO);

  return {
    width: frameWidth,
    height: frameWidth / WEB_PLAYTEST_ASPECT_RATIO,
  };
}

export function usePlaytestViewport() {
  const dimensions = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return dimensions;
  }

  return {
    ...dimensions,
    ...getWebPlaytestFrame(dimensions),
  };
}
