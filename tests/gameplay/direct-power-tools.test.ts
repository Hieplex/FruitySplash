import { describe, expect, it } from 'vitest';

import {
  DIRECT_SPECIAL_POWER_TO_KIND,
  getDirectSpecialPowerKind,
  getLineRocketCellDelayMs,
  getLineRocketTravelDirection,
} from '../../src/gameplay/direct-power-tools';

describe('direct power tools', () => {
  it('maps gameplay buttons to the requested special clear kinds', () => {
    expect(DIRECT_SPECIAL_POWER_TO_KIND).toEqual({
      lineRocket: 'row-wipe',
      fruityCross: 'cross-wipe',
      lightningFruits: 'color-clear',
    });
    expect(getDirectSpecialPowerKind('lineRocket')).toBe('row-wipe');
    expect(getDirectSpecialPowerKind('fruityCross')).toBe('cross-wipe');
    expect(getDirectSpecialPowerKind('lightningFruits')).toBe('color-clear');
  });

  it('chooses LineRocket travel direction from the nearest row edge', () => {
    expect(getLineRocketTravelDirection({ row: 2, col: 0 }, 6)).toBe('left-to-right');
    expect(getLineRocketTravelDirection({ row: 2, col: 2 }, 6)).toBe('left-to-right');
    expect(getLineRocketTravelDirection({ row: 2, col: 3 }, 6)).toBe('right-to-left');
    expect(getLineRocketTravelDirection({ row: 2, col: 5 }, 6)).toBe('right-to-left');
  });

  it('delays LineRocket cells in rocket travel order', () => {
    expect(getLineRocketCellDelayMs({ row: 0, col: 0 }, 6, 'left-to-right')).toBe(0);
    expect(getLineRocketCellDelayMs({ row: 0, col: 3 }, 6, 'left-to-right')).toBe(420);
    expect(getLineRocketCellDelayMs({ row: 0, col: 5 }, 6, 'left-to-right')).toBe(700);
    expect(getLineRocketCellDelayMs({ row: 0, col: 5 }, 6, 'right-to-left')).toBe(0);
    expect(getLineRocketCellDelayMs({ row: 0, col: 2 }, 6, 'right-to-left')).toBe(420);
    expect(getLineRocketCellDelayMs({ row: 0, col: 0 }, 6, 'right-to-left')).toBe(700);
  });
});
