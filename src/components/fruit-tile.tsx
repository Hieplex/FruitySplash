import { Image, Pressable, type ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fruitRuntimeAssetIds, fruitRuntimeAssets } from '@/game/assets/runtime-assets';
import { colors, fruitAccentColors } from '@/theme/colors';

export function FruitTileImage({
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
    return <Image source={source} style={{ width: size, height: size, opacity }} resizeMode="contain" />;
  }

  if (svg) {
    return <SvgXml xml={svg} width={size} height={size} opacity={opacity} />;
  }

  return <Image source={{ uri } satisfies ImageSourcePropType} style={{ width: size, height: size, opacity }} />;
}

export function FruitTile({
  fruit,
  size,
  imageScale = 1.28,
  selected,
  onPress,
  disabled = false,
}: {
  fruit: number;
  size: number;
  imageScale?: number;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const assetId = fruitRuntimeAssetIds[fruit] ?? fruitRuntimeAssetIds[0];
  const asset = fruitRuntimeAssets[assetId];
  const accent = fruitAccentColors[fruit] ?? colors.coral;
  const imageSize = Math.round(size * imageScale);

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
      <FruitTileImage source={asset} uri="" size={imageSize} />
    </Pressable>
  );
}
