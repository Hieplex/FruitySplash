import { describe, expect, it } from 'vitest';

import { createBoardFromRows } from '../../src/game/board';
import { findMatches, getMatchGroupScore, getMatchedCells } from '../../src/game/match';

describe('match detection', () => {
  it('detects the same fruit and tier metadata from numeric fixture boards', () => {
    const board = createBoardFromRows([
      [0, 0, 0, 1, 2, 3],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(findMatches(board)[0]).toMatchObject({
      axis: 'row',
      fruit: 0,
      size: 3,
      tier: 3,
    });
  });

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
      size: match.size,
      tier: match.tier,
      length: match.cells.length,
    }))).toEqual([
      { axis: 'row', fruit: 4, size: 3, tier: 3, length: 3 },
      { axis: 'column', fruit: 4, size: 3, tier: 3, length: 3 },
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

  it('classifies long matches from four through seven cells', () => {
    const boards = [
      createBoardFromRows([
        [0, 0, 0, 0, 1, 2],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
        [3, 4, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
      ]),
      createBoardFromRows([
        [1, 1, 1, 1, 1, 2],
        [0, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
        [3, 4, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
      ]),
      createBoardFromRows([
        [2, 2, 2, 2, 2, 2],
        [0, 1, 3, 4, 0, 1],
        [1, 3, 4, 0, 1, 2],
        [3, 4, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
      ]),
      createBoardFromRows([
        [4, 1, 2, 3, 0, 1],
        [4, 2, 3, 0, 1, 2],
        [4, 3, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [4, 1, 2, 3, 0, 1],
        [4, 2, 3, 0, 1, 2],
        [4, 3, 0, 1, 2, 3],
        [0, 4, 1, 2, 3, 4],
      ]),
    ];

    const longMatches = boards.map((board) => findMatches(board).find((match) => match.size >= 4));

    expect(longMatches.map((match) => match && ({
      axis: match.axis,
      fruit: match.fruit,
      size: match.size,
      tier: match.tier,
      points: getMatchGroupScore(match),
    }))).toEqual([
      { axis: 'row', fruit: 0, size: 4, tier: 4, points: 60 },
      { axis: 'row', fruit: 1, size: 5, tier: 5, points: 100 },
      { axis: 'row', fruit: 2, size: 6, tier: 6, points: 150 },
      { axis: 'column', fruit: 4, size: 7, tier: 7, points: 210 },
    ]);
  });
});
