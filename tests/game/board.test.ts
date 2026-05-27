import { describe, expect, it } from 'vitest';

import {
  createBoard,
  createBoardFromRows,
  hasAvailableMoves,
  isAdjacent,
  swapCells,
} from '../../src/game/board';
import { findMatches } from '../../src/game/match';

describe('board', () => {
  it('creates deterministic 8x6 boards with five fruit types and no immediate matches', () => {
    const first = createBoard({ rows: 8, cols: 6, fruitTypes: 5, seed: 7 });
    const second = createBoard({ rows: 8, cols: 6, fruitTypes: 5, seed: 7 });

    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect(first.every((row) => row.length === 6)).toBe(true);
    expect(first.flat().every((fruit) => fruit >= 0 && fruit < 5)).toBe(true);
    expect(findMatches(first)).toEqual([]);
  });

  it('swaps only adjacent cells and keeps the original board immutable', () => {
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

    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 2, col: 0 })).toBe(false);

    const swapped = swapCells(board, { row: 0, col: 0 }, { row: 0, col: 1 });

    expect(board[0][0]).toBe(0);
    expect(board[0][1]).toBe(1);
    expect(swapped[0][0]).toBe(1);
    expect(swapped[0][1]).toBe(0);
    expect(() => swapCells(board, { row: 0, col: 0 }, { row: 2, col: 0 })).toThrow(
      /adjacent/i,
    );
  });

  it('detects whether a board still has any valid swap', () => {
    const playableBoard = createBoardFromRows([
      [0, 1, 0, 3, 4, 1],
      [2, 0, 3, 4, 1, 2],
      [1, 2, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const deadBoard = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    expect(hasAvailableMoves(playableBoard)).toBe(true);
    expect(hasAvailableMoves(deadBoard)).toBe(false);
  });
});
