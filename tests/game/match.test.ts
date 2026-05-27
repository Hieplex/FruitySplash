import { describe, expect, it } from 'vitest';

import { createBoardFromRows } from '../../src/game/board';
import { findMatches, getMatchedCells } from '../../src/game/match';

describe('match detection', () => {
  it('finds horizontal and vertical matches and de-duplicates shared cells', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 4, 0, 1, 2],
      [2, 4, 4, 4, 2, 3],
      [3, 1, 4, 2, 3, 4],
      [4, 0, 1, 3, 4, 0],
      [0, 1, 2, 4, 0, 1],
      [1, 2, 3, 0, 1, 2],
      [2, 3, 4, 1, 2, 3],
    ]);

    const matches = findMatches(board);

    expect(matches.map((match) => ({
      axis: match.axis,
      fruit: match.fruit,
      length: match.cells.length,
    }))).toEqual([
      { axis: 'row', fruit: 4, length: 3 },
      { axis: 'column', fruit: 4, length: 3 },
    ]);
    expect(getMatchedCells(matches)).toEqual([
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 3, col: 2 },
    ]);
  });

  it('returns an empty list when the board has no three-in-a-row segments', () => {
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

    expect(findMatches(board)).toEqual([]);
  });
});
