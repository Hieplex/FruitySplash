import { describe, expect, it } from 'vitest';

import { createBoardFromRows } from '../../../src/game/board';
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

describe('hammer booster clear area', () => {
  it('clears only the single target cell', () => {
    const target = { row: 3, col: 2 };
    const cleared = clearMatchedCells(board, [target]);
    
    // Check that target cell is indeed cleared (set to null)
    expect(cleared[3][2]).toBe(null);
    
    // Check that neighboring cells are untouched
    expect(cleared[2][2]).toEqual(board[2][2]);
    expect(cleared[4][2]).toEqual(board[4][2]);
    expect(cleared[3][1]).toEqual(board[3][1]);
    expect(cleared[3][3]).toEqual(board[3][3]);
  });

  it('creates downward-only unique drop motions after a hammer clear', () => {
    const target = { row: 3, col: 2 };
    const cleared = clearMatchedCells(board, [target]);
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
