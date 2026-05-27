import { describe, expect, it } from 'vitest';
import { isBombEffectCell, type BombDropAnimation } from '@/components/bomb-effect-cell';

describe('BombEffectLayer', () => {
  const animation: BombDropAnimation = {
    key: 1,
    target: { row: 3, col: 3 },
  };

  it('scopes the visual effect to the target 3x3 cells', () => {
    expect(isBombEffectCell(animation, 2, 2)).toBe(true);
    expect(isBombEffectCell(animation, 3, 3)).toBe(true);
    expect(isBombEffectCell(animation, 4, 4)).toBe(true);
    expect(isBombEffectCell(animation, 1, 3)).toBe(false);
    expect(isBombEffectCell(animation, 3, 5)).toBe(false);
  });

  it('does not hide cells when no bomb effect is active', () => {
    expect(isBombEffectCell(null, 3, 3)).toBe(false);
  });
});
