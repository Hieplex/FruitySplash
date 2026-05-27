import { describe, expect, it } from 'vitest';

import { createBoardFromRows } from '../../src/game/board';
import { findRecommendedMove } from '../../src/game/move-hints';

describe('move hints', () => {
  it('returns the first adjacent swap that creates a match with matched cells', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 1],
      [0, 2, 3, 4, 1, 2],
      [1, 0, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(findRecommendedMove(board)).toEqual({
      from: { row: 1, col: 2 },
      to: { row: 1, col: 3 },
      matchedCells: [
        { row: 1, col: 2 },
        { row: 2, col: 2 },
        { row: 3, col: 2 },
      ],
      hintCells: [
        { row: 1, col: 3 },
        { row: 2, col: 2 },
        { row: 3, col: 2 },
      ],
    });
  });

  it('returns null when no swap can create a match', () => {
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

    expect(findRecommendedMove(board)).toBeNull();
  });
});
