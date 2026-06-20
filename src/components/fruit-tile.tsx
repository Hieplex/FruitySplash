import { memo } from 'react';
import { Image, Pressable, View, type ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fruitRuntimeAssetIds, fruitRuntimeAssets, specialFruitRuntimeAssets } from '@/game/assets/runtime-assets';
import { getSpecialFruitAssetVariant } from '@/game/special-fruit-assets';
import type { SpecialCellKind, SpecialMatchTier } from '@/game/types';
import { colors, fruitAccentColors } from '@/theme/colors';

export const FruitTileImage = memo(function FruitTileImage({
  uri,
  svg,
  source,
  size,
  opacity = 1,
}: {
  uri: string;
  svg?: string;
  source?: ImageSourcePropType;
  size: number;
  opacity?: number;
}) {
  if (source) {
    return <Image source={source} fadeDuration={0} style={{ width: size, height: size, opacity }} resizeMode="contain" resizeMethod="resize" />;
  }

  if (svg) {
    return <SvgXml xml={svg} width={size} height={size} opacity={opacity} />;
  }

  return <Image source={{ uri } satisfies ImageSourcePropType} fadeDuration={0} style={{ width: size, height: size, opacity }} resizeMethod="resize" />;
});

type FruitTileProps = {
  fruit: number;
  size: number;
  imageScale?: number;
  selected: boolean;
  special?: {
    kind: SpecialCellKind;
    powerTier: SpecialMatchTier;
  } | null;
  onPress: () => void;
  disabled?: boolean;
};

export const FruitTile = memo(function FruitTile({
  fruit,
  size,
  imageScale = 1.28,
  selected,
  special = null,
  onPress,
  disabled = false,
}: FruitTileProps) {
  const assetId = fruitRuntimeAssetIds[fruit] ?? fruitRuntimeAssetIds[0];
  const asset = fruitRuntimeAssets[assetId];
  const specialVariant = special ? getSpecialFruitAssetVariant(special.kind) : null;
  const specialAsset = specialVariant ? specialFruitRuntimeAssets[assetId]?.[specialVariant] : null;
  const accent = fruitAccentColors[fruit] ?? colors.coral;
  const imageSize = Math.round(size * imageScale);
  const markerColor =
    special?.kind === 'column-wipe'
      ? '#dff7ff'
      : special?.kind === 'color-clear'
        ? '#f6d8ff'
        : '#fff0aa';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        shadowColor: accent,
        shadowOpacity: selected ? 0.3 : 0,
        shadowRadius: selected ? 10 : 0,
        shadowOffset: { width: 0, height: selected ? 5 : 0 },
        elevation: selected ? 4 : 0,
      }}
    >
      <FruitTileImage source={specialAsset ?? asset} uri="" size={imageSize} />
      {special && !specialAsset ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: Math.max(2, Math.round(size * 0.08)),
              borderRadius: size / 2,
              borderWidth: Math.max(2, Math.round(size * 0.06)),
              borderColor: markerColor,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          />
          {special.kind === 'row-wipe' || special.kind === 'cross-wipe' ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: size / 2 - 2,
                left: size / 2 - size * 0.2,
                width: size * 0.4,
                height: 4,
                borderRadius: 999,
                backgroundColor: special.kind === 'cross-wipe' ? '#fff6f8' : '#fff6cf',
                opacity: 0.95,
              }}
            />
          ) : null}
          {special.kind === 'column-wipe' || special.kind === 'cross-wipe' ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: size / 2 - size * 0.2,
                left: size / 2 - 2,
                width: 4,
                height: size * 0.4,
                borderRadius: 999,
                backgroundColor: special.kind === 'cross-wipe' ? '#fff6f8' : '#edfaff',
                opacity: 0.95,
              }}
            />
          ) : null}
          {special.kind === 'color-clear' ? (
            <>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: size * 0.2,
                  height: size * 0.2,
                  borderRadius: 999,
                  backgroundColor: '#fff3ff',
                  opacity: 0.98,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: size * 0.46,
                  height: size * 0.46,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: '#ffe3ff',
                  opacity: 0.88,
                }}
              />
            </>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}, areFruitTilePropsEqual);

function areFruitTilePropsEqual(previous: FruitTileProps, next: FruitTileProps) {
  return (
    previous.fruit === next.fruit &&
    previous.size === next.size &&
    (previous.imageScale ?? 1.28) === (next.imageScale ?? 1.28) &&
    previous.selected === next.selected &&
    previous.disabled === next.disabled &&
    previous.onPress === next.onPress &&
    previous.special?.kind === next.special?.kind &&
    previous.special?.powerTier === next.special?.powerTier
  );
}
