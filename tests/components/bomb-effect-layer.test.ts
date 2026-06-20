import { describe, expect, it } from 'vitest';
import {
  getBombExplosionFrame,
  getBombShockwaveFrame,
  getBombShockwaveScaleRange,
  isBombEffectCell,
  type BombDropAnimation,
} from '@/components/bomb-effect-cell';

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

  it('insets the explosion inside the shockwave frame', () => {
    expect(getBombExplosionFrame({ x: 10, y: 20, size: 90 })).toEqual({
      x: 23,
      y: 33,
      size: 64,
    });
  });

  it('sizes the shockwave to the blue-ring footprint without overscaling', () => {
    expect(getBombShockwaveFrame({ row: 2, col: 3 }, 40, 4)).toEqual({
      x: 97,
      y: 53,
      size: 200000,
    });
    expect(getBombShockwaveScaleRange()).toEqual([0.05, 0.42, 1, 1]);
  });
});
