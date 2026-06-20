import type { SpecialCellKind } from '@/game/types';

export type SpecialFruitAssetVariant = 'horizontal' | 'vertical' | 'cross';

export function getSpecialFruitAssetVariant(kind: SpecialCellKind): SpecialFruitAssetVariant {
  if (kind === 'row-wipe') {
    return 'horizontal';
  }

  if (kind === 'column-wipe') {
    return 'vertical';
  }

  return 'cross';
}
