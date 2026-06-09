import { describe, expect, it } from 'vitest';

import { createBoardFromRows, getCellFruit, isSpecialCell } from '../../src/game/board';
import { clearMatchedCells, collapseBoard, createQueueRefill, createSeededRefill } from '../../src/game/gravity';
import type { SpecialCell } from '../../src/game/types';

describe('gravity', () => {
  it('preserves special cells as they fall and keeps drop motion fruit numeric', () => {
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
    const special: SpecialCell = { type: 'special', fruit: 4, kind: 'row-wipe', powerTier: 4 };
    board[2][0] = special;
    const cleared = clearMatchedCells(board, [
      { row: 5, col: 0 },
      { row: 6, col: 0 },
      { row: 7, col: 0 },
    ]);
    const carriedCell = cleared[2][0];

    const result = collapseBoard(cleared, createQueueRefill([1, 2, 3]));

    expect(result.board[5][0]).toEqual(special);
    expect(result.board[5][0]).not.toBe(special);
    expect(result.board[5][0]).not.toBe(carriedCell);
    expect(isSpecialCell(result.board[5][0])).toBe(true);
    expect(getCellFruit(result.board[5][0])).toBe(4);
    expect(result.dropMotions).toContainEqual({
      fruit: 4,
      from: { row: 2, col: 0 },
      to: { row: 5, col: 0 },
      spawned: false,
    });
  });

  it('clears matched cells without changing the rest of the board', () => {
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

    const cleared = clearMatchedCells(board, [
      { row: 5, col: 0 },
      { row: 6, col: 0 },
      { row: 7, col: 0 },
    ]);

    expect(cleared[5][0]).toBeNull();
    expect(cleared[6][0]).toBeNull();
    expect(cleared[7][0]).toBeNull();
    expect(cleared[4][0] && getCellFruit(cleared[4][0])).toBe(4);
    expect(cleared[7][1] && getCellFruit(cleared[7][1])).toBe(3);
  });

  it('collapses fruit downward and refills deterministically from a queue', () => {
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
    const cleared = clearMatchedCells(board, [
      { row: 1, col: 0 },
      { row: 3, col: 0 },
      { row: 6, col: 0 },
    ]);

    const result = collapseBoard(cleared, createQueueRefill([4, 3, 2]));

    expect(result.board.map((row) => getCellFruit(row[0]))).toEqual([4, 3, 2, 0, 2, 4, 0, 2]);
    expect(result.spawned).toEqual([
      { row: 0, col: 0, fruit: 4 },
      { row: 1, col: 0, fruit: 3 },
      { row: 2, col: 0, fruit: 2 },
    ]);
    expect(result.dropMotions.filter((motion) => motion.to.col === 0)).toEqual([
      { fruit: 4, from: { row: -3, col: 0 }, to: { row: 0, col: 0 }, spawned: true },
      { fruit: 3, from: { row: -2, col: 0 }, to: { row: 1, col: 0 }, spawned: true },
      { fruit: 2, from: { row: -1, col: 0 }, to: { row: 2, col: 0 }, spawned: true },
      { fruit: 0, from: { row: 0, col: 0 }, to: { row: 3, col: 0 }, spawned: false },
      { fruit: 2, from: { row: 2, col: 0 }, to: { row: 4, col: 0 }, spawned: false },
      { fruit: 4, from: { row: 4, col: 0 }, to: { row: 5, col: 0 }, spawned: false },
      { fruit: 0, from: { row: 5, col: 0 }, to: { row: 6, col: 0 }, spawned: false },
    ]);
  });

  it('creates deterministic refill fruit without a finite queue limit', () => {
    const first = createSeededRefill({ seed: 42, fruitTypes: 5 });
    const second = createSeededRefill({ seed: 42, fruitTypes: 5 });

    const firstValues = Array.from({ length: 300 }, (_, index) => first.next({ row: index, col: index % 6 }));
    const secondValues = Array.from({ length: 300 }, (_, index) => second.next({ row: index, col: index % 6 }));

    expect(firstValues).toEqual(secondValues);
    expect(firstValues.every((fruit) => Number.isInteger(fruit) && fruit >= 0 && fruit < 5)).toBe(true);
  });
});
