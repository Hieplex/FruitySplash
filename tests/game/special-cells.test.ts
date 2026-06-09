import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  getSpecialCellClearCells,
  getSpecialCellKindForMatch,
  pickSpecialCellPosition,
} from '../../src/game/special-cells';
import { createBoardFromRows } from '../../src/game/board';
import type { MatchGroup, SpecialMatchTier } from '../../src/game/types';

const rowMatch4: MatchGroup = {
  axis: 'row',
  fruit: 2,
  size: 4,
  tier: 4,
  cells: [
    { row: 3, col: 1 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
    { row: 3, col: 4 },
  ],
};

const columnMatch5: MatchGroup = {
  axis: 'column',
  fruit: 4,
  size: 5,
  tier: 5,
  cells: [
    { row: 1, col: 2 },
    { row: 2, col: 2 },
    { row: 3, col: 2 },
    { row: 4, col: 2 },
    { row: 5, col: 2 },
  ],
};

const rowMatch3: MatchGroup = {
  axis: 'row',
  fruit: 1,
  size: 3,
  tier: 3,
  cells: [
    { row: 6, col: 0 },
    { row: 6, col: 1 },
    { row: 6, col: 2 },
  ],
};

describe('special cells', () => {
  it('creates row wipe specials from horizontal match 4', () => {
    const special = getSpecialCellKindForMatch(rowMatch4);

    expect(special).toEqual({
      kind: 'row-wipe',
      powerTier: 4,
      fruit: 2,
    });
    expectTypeOf(special?.powerTier).toEqualTypeOf<SpecialMatchTier | undefined>();
  });

  it('creates cross wipe specials from match 5 or 6', () => {
    expect(getSpecialCellKindForMatch(columnMatch5)).toEqual({
      kind: 'cross-wipe',
      powerTier: 5,
      fruit: 4,
    });
  });

  it('creates color clear specials from match 7', () => {
    expect(
      getSpecialCellKindForMatch({
        axis: 'row',
        fruit: 3,
        size: 7,
        tier: 7,
        cells: [
          { row: 2, col: 0 },
          { row: 2, col: 1 },
          { row: 2, col: 2 },
          { row: 2, col: 3 },
          { row: 2, col: 4 },
          { row: 2, col: 5 },
          { row: 2, col: 6 },
        ],
      }),
    ).toEqual({
      kind: 'color-clear',
      powerTier: 7,
      fruit: 3,
    });
  });

  it('returns null for tier 3 matches', () => {
    expect(getSpecialCellKindForMatch(rowMatch3)).toBeNull();
  });

  it('places the special on the moved cell when it belongs to the match', () => {
    expect(pickSpecialCellPosition(rowMatch4, { row: 3, col: 4 })).toEqual({ row: 3, col: 4 });
  });

  it('falls back to the center-most cell', () => {
    expect(pickSpecialCellPosition(rowMatch4, { row: 0, col: 0 })).toEqual({ row: 3, col: 2 });
  });

  it('clears a full row for row wipe specials', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(getSpecialCellClearCells({ row: 2, col: 3 }, 'row-wipe', board)).toEqual([
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ]);
  });

  it('clears a full column for column wipe specials', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(getSpecialCellClearCells({ row: 2, col: 3 }, 'column-wipe', board)).toEqual([
      { row: 0, col: 3 },
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 3, col: 3 },
      { row: 4, col: 3 },
      { row: 5, col: 3 },
      { row: 6, col: 3 },
      { row: 7, col: 3 },
    ]);
  });

  it('clears both row and column for cross wipe specials', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(getSpecialCellClearCells({ row: 2, col: 3 }, 'cross-wipe', board)).toEqual([
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
      { row: 0, col: 3 },
      { row: 1, col: 3 },
      { row: 3, col: 3 },
      { row: 4, col: 3 },
      { row: 5, col: 3 },
      { row: 6, col: 3 },
      { row: 7, col: 3 },
    ]);
  });

  it('clears every fruit of the chosen type for color clear specials', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(getSpecialCellClearCells({ row: 2, col: 3 }, 'color-clear', board, 4)).toEqual([
      { row: 0, col: 4 },
      { row: 1, col: 3 },
      { row: 2, col: 2 },
      { row: 3, col: 1 },
      { row: 4, col: 0 },
      { row: 4, col: 5 },
      { row: 5, col: 4 },
      { row: 6, col: 3 },
      { row: 7, col: 2 },
    ]);
  });
});
