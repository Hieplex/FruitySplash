import { describe, expect, it } from 'vitest';

import { createBoardFromRows } from '../../src/game/board';
import { getBoardCellFromPoint, getSwipeTarget } from '../../src/gameplay/swipe';

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

describe('swipe target detection', () => {
  it('converts a strong horizontal swipe into the neighboring cell', () => {
    expect(getSwipeTarget({ row: 2, col: 2 }, { dx: 36, dy: 8 }, board)).toEqual({
      row: 2,
      col: 3,
    });

    expect(getSwipeTarget({ row: 2, col: 2 }, { dx: -36, dy: 8 }, board)).toEqual({
      row: 2,
      col: 1,
    });
  });

  it('converts a strong vertical swipe into the neighboring cell', () => {
    expect(getSwipeTarget({ row: 2, col: 2 }, { dx: 6, dy: 32 }, board)).toEqual({
      row: 3,
      col: 2,
    });

    expect(getSwipeTarget({ row: 2, col: 2 }, { dx: 6, dy: -32 }, board)).toEqual({
      row: 1,
      col: 2,
    });
  });

  it('ignores tiny drags and swipes outside the board', () => {
    expect(getSwipeTarget({ row: 2, col: 2 }, { dx: 8, dy: 3 }, board)).toBeNull();
    expect(getSwipeTarget({ row: 0, col: 0 }, { dx: -40, dy: 4 }, board)).toBeNull();
    expect(getSwipeTarget({ row: 0, col: 0 }, { dx: 4, dy: -40 }, board)).toBeNull();
  });

  it('finds the touched board cell from the finger start point', () => {
    expect(
      getBoardCellFromPoint(
        { x: 74, y: 138 },
        {
          rows: 8,
          cols: 6,
          tileSize: 58,
          gap: 4,
          boardPadding: 4,
        },
      ),
    ).toEqual({ row: 2, col: 1 });
  });

  it('snaps gap touches to the nearest playable tile', () => {
    const metrics = {
      rows: 8,
      cols: 6,
      tileSize: 58,
      gap: 4,
      boardPadding: 4,
    };

    expect(getBoardCellFromPoint({ x: 2, y: 20 }, metrics)).toBeNull();
    expect(getBoardCellFromPoint({ x: 64, y: 20 }, metrics)).toEqual({ row: 0, col: 1 });
    expect(getBoardCellFromPoint({ x: 600, y: 20 }, metrics)).toBeNull();
  });
});
