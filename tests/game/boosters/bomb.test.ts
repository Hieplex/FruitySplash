import { describe, expect, it } from 'vitest';

import { createBoardFromRows } from '../../../src/game/board';
import { getBombBlastCells } from '../../../src/game/boosters/bomb';
import { clearMatchedCells, collapseBoard, createQueueRefill } from '../../../src/game/gravity';

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

describe('bomb booster blast area', () => {
  it('returns the 3x3 area around the target cell', () => {
    expect(getBombBlastCells({ row: 1, col: 1 }, board)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it('clips the blast area at board edges', () => {
    expect(getBombBlastCells({ row: 0, col: 0 }, board)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
  });

  it('creates downward-only unique drop motions after a bomb clear', () => {
    const blastCells = getBombBlastCells({ row: 3, col: 2 }, board);
    const cleared = clearMatchedCells(board, blastCells);
    const collapsed = collapseBoard(cleared, createQueueRefill(Array.from({ length: 32 }, (_, index) => index % 5)));
    const targets = new Set(collapsed.dropMotions.map((motion) => `${motion.to.row}:${motion.to.col}`));

    expect(targets.size).toBe(collapsed.dropMotions.length);
    expect(collapsed.dropMotions.length).toBeGreaterThan(0);
    collapsed.dropMotions.forEach((motion) => {
      expect(motion.to.row).toBeGreaterThan(motion.from.row);
      if (motion.spawned) {
        expect(motion.from.row).toBeLessThan(0);
      }
    });
  });
});
