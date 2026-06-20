import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

const specialFruitFiles = {
  strawberry: ['StrawberryHorizontal.png', 'StrawberryVertical.png', 'StrawberryCross.png'],
  apple: ['AppleHorizontal.png', 'AppleVertical.png', 'AppleCross.png'],
  orange: ['OrangeHorizontal.png', 'OrangeVertical.png', 'OrangeCross.png'],
  grape: ['GrapeHorizontal.png', 'GrapeVertical.png', 'GrapeCross.png'],
  blueberry: ['BlueberryHorizontal.png', 'BlueberryVertical.png', 'BlueberryCross.png'],
} as const;

describe('special fruit image wiring', () => {
  it('registers horizontal, vertical, and cross images for every active fruit', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');

    for (const [fruit, filenames] of Object.entries(specialFruitFiles)) {
      for (const filename of filenames) {
        expect(runtimeAssets).toContain(`../../../assets/fruity/Fruit-type/${fruit[0].toUpperCase()}${fruit.slice(1)}/${filename}`);
      }
    }

    expect(runtimeAssets).toContain('export const specialFruitRuntimeAssets');
    expect(preloadAssets).toContain('...Object.values(specialFruitRuntimeAssets).flatMap');
  });

  it('uses special fruit images for board tiles and merge animation targets', () => {
    const fruitTile = readFileSync(path.join(projectRoot, 'src/components/fruit-tile.tsx'), 'utf8');
    const specialCellLayer = readFileSync(path.join(projectRoot, 'src/components/special-cell-layer.tsx'), 'utf8');

    expect(fruitTile).toContain('getSpecialFruitAssetVariant');
    expect(fruitTile).toContain('const specialAsset =');
    expect(fruitTile).toContain('source={specialAsset ?? asset}');
    expect(fruitTile).toContain('!specialAsset ? (');
    expect(specialCellLayer).toContain('getSpecialFruitAssetSource');
    expect(specialCellLayer).toContain('const specialTargetAsset = getSpecialFruitAssetSource');
    expect(specialCellLayer).toContain('specialTargetAsset ? (');
    expect(specialCellLayer).toContain('source={specialTargetAsset}');
  });

  it('keeps special fruit images visible while FruityCross sweeps over special cells', () => {
    const specialCellLayer = readFileSync(path.join(projectRoot, 'src/components/special-cell-layer.tsx'), 'utf8');

    expect(specialCellLayer).toContain('const specialClearCellAsset = isSpecialCell(source)');
    expect(specialCellLayer).toContain('source={specialClearCellAsset ?? fruitRuntimeAssets[assetId]}');
  });

  it('keeps special fruit images visible while Lightning Fruit strikes special cells', () => {
    const specialCellLayer = readFileSync(path.join(projectRoot, 'src/components/special-cell-layer.tsx'), 'utf8');

    expect(specialCellLayer).toContain('const lightningSpecial = isSpecialCell(source)');
    expect(specialCellLayer).toContain('special={lightningSpecial}');
  });
});
