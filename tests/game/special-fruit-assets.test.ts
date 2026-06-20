import { describe, expect, it } from 'vitest';

import { getSpecialFruitAssetVariant } from '../../src/game/special-fruit-assets';

describe('special fruit asset variants', () => {
  it('maps special cell kinds to fruit-specific image variants', () => {
    expect(getSpecialFruitAssetVariant('row-wipe')).toBe('horizontal');
    expect(getSpecialFruitAssetVariant('column-wipe')).toBe('vertical');
    expect(getSpecialFruitAssetVariant('cross-wipe')).toBe('cross');
    expect(getSpecialFruitAssetVariant('color-clear')).toBe('cross');
  });
});
