import { describe, expect, it } from 'vitest';

import {
  createBoardFromRows,
  getCellFruit,
  hasAvailableMoves,
  isSpecialCell,
} from '../../src/game/board';
import { createQueueRefill } from '../../src/game/gravity';
import {
  createTimer,
  ensurePlayableBoard,
  getTimerSnapshot,
  resolveBoardMatches,
  resolveSwap,
} from '../../src/game/engine';

describe('engine', () => {
  it('rejects non-adjacent swaps and adjacent swaps that do not create a match', () => {
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

    const nonAdjacent = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 0, col: 0 }, to: { row: 2, col: 0 } },
      { refill: createQueueRefill([0, 1, 2]) },
    );
    const noMatch = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
      { refill: createQueueRefill([0, 1, 2]) },
    );

    expect(nonAdjacent.accepted).toBe(false);
    expect(nonAdjacent.reason).toMatch(/adjacent/i);
    expect(noMatch.accepted).toBe(false);
    expect(noMatch.reason).toMatch(/match/i);
    expect(noMatch.board).toEqual(board);
  });

  it('resolves cascades deterministically and reports scoring hooks for each chain', () => {
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
    const events: Array<{
      chain: number;
      points: number;
      total: number;
      board: ReturnType<typeof createBoardFromRows>;
      settledBoard: ReturnType<typeof createBoardFromRows>;
      matches: Array<{ fruit: number; cells: Array<{ row: number; col: number }> }>;
    }> = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 2, col: 0 }, to: { row: 2, col: 1 } },
      {
        refill: createQueueRefill([4, 4, 4, 1, 2, 3]),
        onScore: ({ chain, points, total, board, settledBoard, matches }) => {
          events.push({ chain, points, total, board, settledBoard, matches });
        },
      },
    );

    expect(result.accepted).toBe(true);
    expect(result.cascadeCount).toBe(2);
    expect(result.clearedCells).toBe(6);
    expect(result.score).toBe(90);
    expect(events.map(({ chain, points, total }) => ({ chain, points, total }))).toEqual([
      { chain: 1, points: 30, total: 30 },
      { chain: 2, points: 60, total: 90 },
    ]);
    expect(events[0].matches).toEqual([
      {
        axis: 'column',
        fruit: 0,
        size: 3,
        tier: 3,
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 2, col: 0 },
        ],
      },
    ]);
    expect(events[0].board).toEqual(createBoardFromRows([
      [0, 1, 2, 3, 4, 1],
      [0, 2, 3, 4, 1, 2],
      [0, 1, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]));
    expect(events[0].board[0][0]).not.toBe(board[0][0]);
    expect(events[1].board.map((row) => getCellFruit(row[0]))).toEqual([4, 4, 4, 2, 3, 4, 1, 2]);
    expect(events[1].settledBoard.map((row) => getCellFruit(row[0]))).toEqual([1, 2, 3, 2, 3, 4, 1, 2]);
    expect(events[1].settledBoard[0][0]).not.toBe(result.board[0][0]);
    expect(result.board.map((row) => getCellFruit(row[0]))).toEqual([1, 2, 3, 2, 3, 4, 1, 2]);
  });

  it('resolves matches that already exist on the board after a booster refill', () => {
    const board = createBoardFromRows([
      [4, 4, 4, 3, 4, 1],
      [2, 0, 3, 4, 1, 2],
      [1, 2, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const events: Array<{ chain: number; points: number; total: number; board: ReturnType<typeof createBoardFromRows> }> = [];

    const result = resolveBoardMatches(
      { board, score: 100, movesUsed: 2 },
      {
        refill: createQueueRefill([1, 2, 3]),
        onScore: ({ chain, points, total, board }) => {
          events.push({ chain, points, total, board });
        },
      },
    );

    expect(result.cascadeCount).toBe(1);
    expect(result.clearedCells).toBe(3);
    expect(result.score).toBe(130);
    expect(result.movesUsed).toBe(2);
    expect(events).toEqual([
      {
        chain: 1,
        points: 30,
        total: 130,
        board,
      },
    ]);
    expect(result.board[0].slice(0, 3).map(getCellFruit)).toEqual([1, 2, 3]);
  });

  it('awards long-match bonus points through normal swap resolution', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [0, 0, 0, 3, 0, 4],
    ]);
    const scoreEvents: Array<{ points: number; cleared: number; size: number; tier: number }> = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 7, col: 3 }, to: { row: 7, col: 4 } },
      {
        refill: createQueueRefill([1, 2, 3, 4]),
        onScore: (event) => {
          scoreEvents.push({
            points: event.points,
            cleared: event.cleared,
            size: event.matches[0].size,
            tier: event.matches[0].tier,
          });
        },
      },
    );

    expect(result.accepted).toBe(true);
    expect(result.score).toBe(60);
    expect(scoreEvents).toEqual([
      {
        points: 60,
        cleared: 4,
        size: 4,
        tier: 4,
      },
    ]);
  });

  it('turns a swap-created match 4 into one row wipe special at the swapped destination', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [0, 0, 0, 3, 0, 4],
    ]);

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 7, col: 4 }, to: { row: 7, col: 3 } },
      { refill: createQueueRefill([1, 2, 3, 4, 0, 1, 2, 3]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.clearedCells).toBe(4);
    expect(result.board[7][3]).toEqual({
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    });
    expect(result.board[7].slice(0, 3).some(isSpecialCell)).toBe(false);
    expect(result.board[7].slice(0, 3).map(getCellFruit)).toEqual([1, 2, 3]);
  });

  it('turns a vertical match 5 into one cross wipe special', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 4, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 4, 2, 3],
      [4, 0, 4, 2, 3, 4],
      [0, 1, 4, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 3, col: 3 }, to: { row: 3, col: 2 } },
      { refill: createQueueRefill([0, 1, 2, 3, 4, 0, 1, 2]) },
    );
    const specials = result.board.flat().filter(isSpecialCell);

    expect(result.accepted).toBe(true);
    expect(result.clearedCells).toBe(5);
    expect(specials).toEqual([
      {
        type: 'special',
        fruit: 4,
        kind: 'cross-wipe',
        powerTier: 5,
      },
    ]);
  });

  it('treats a swap-created T shape as one match 5 cross special', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 4, 3, 0],
      [1, 2, 4, 0, 4, 1],
      [2, 3, 1, 4, 0, 2],
      [3, 4, 0, 4, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const scoreEvents: Array<{ points: number; cleared: number; size: number; tier: number }> = [];
    const timeline: Parameters<NonNullable<Parameters<typeof resolveSwap>[2]['onTimelineEvent']>>[0][] = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 0, col: 3 }, to: { row: 1, col: 3 } },
      {
        refill: createQueueRefill([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
        onScore: (event) => {
          scoreEvents.push({
            points: event.points,
            cleared: event.cleared,
            size: event.matches[0].size,
            tier: event.matches[0].tier,
          });
        },
      },
    );

    expect(result.accepted).toBe(true);
    expect(
      timeline.find((event) => event.type === 'special-create' && event.chain === 1),
    ).toMatchObject({
      type: 'special-create',
      targetCell: { row: 1, col: 3 },
      special: {
        type: 'special',
        fruit: 4,
        kind: 'cross-wipe',
        powerTier: 5,
      },
    });
    expect(scoreEvents[0]).toEqual({
      points: 100,
      cleared: 5,
      size: 5,
      tier: 5,
    });
  });

  it('creates one special for the first simultaneous long match in findMatches order', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 2],
      [4, 0, 1, 3, 4, 2],
      [0, 1, 3, 4, 2, 3],
      [1, 2, 3, 4, 0, 2],
      [0, 0, 0, 0, 1, 4],
    ]);

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 5, col: 4 }, to: { row: 5, col: 5 } },
      { refill: createQueueRefill([4, 4, 1, 0, 1, 3, 4, 2, 3, 4, 0, 1]) },
    );
    const specialPositions = result.board.flatMap((row, rowIndex) =>
      row.flatMap((cell, colIndex) =>
        isSpecialCell(cell)
          ? [{ row: rowIndex, col: colIndex, cell }]
          : [],
      ),
    );

    expect(result.accepted).toBe(true);
    expect(specialPositions).toEqual([
      {
        row: 7,
        col: 1,
        cell: {
          type: 'special',
          fruit: 0,
          kind: 'row-wipe',
          powerTier: 4,
        },
      },
    ]);
  });

  it('accepts a swapped row wipe special from swap.from, clears the full row, and counts the move', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      { refill: createQueueRefill([4, 0, 1, 2, 3, 4]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.movesUsed).toBe(1);
    expect(result.cascadeCount).toBe(0);
    expect(result.clearedCells).toBe(6);
    expect(result.scoreDelta).toBe(0);
    expect(result.board[0].map(getCellFruit)).toEqual([4, 0, 1, 2, 3, 4]);
    expect(result.board[3].map(getCellFruit)).toEqual([2, 3, 4, 0, 1, 2]);
    expect(result.board.flat().some(isSpecialCell)).toBe(false);
  });

  it('accepts a swapped row wipe special from swap.to and still activates it', () => {
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
    board[3][3] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };

    const result = resolveSwap(
      { board, score: 0, movesUsed: 1 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      { refill: createQueueRefill([4, 0, 1, 2, 3, 4]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.movesUsed).toBe(2);
    expect(result.cascadeCount).toBe(0);
    expect(result.clearedCells).toBe(6);
    expect(result.scoreDelta).toBe(0);
    expect(result.board[0].map(getCellFruit)).toEqual([4, 0, 1, 2, 3, 4]);
    expect(result.board[3].map(getCellFruit)).toEqual([2, 3, 4, 0, 1, 2]);
    expect(result.board.flat().some(isSpecialCell)).toBe(false);
  });

  it('accepts a swapped column wipe special and clears the full column', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'column-wipe',
      powerTier: 4,
    };

    const result = resolveSwap(
      { board, score: 0, movesUsed: 2 },
      { from: { row: 3, col: 2 }, to: { row: 4, col: 2 } },
      { refill: createQueueRefill([2, 3, 4, 0, 1, 2, 3, 4]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.movesUsed).toBe(3);
    expect(result.cascadeCount).toBe(0);
    expect(result.clearedCells).toBe(8);
    expect(result.board.map((row) => getCellFruit(row[2]))).toEqual([2, 3, 4, 0, 1, 2, 3, 4]);
    expect(result.board.flat().some(isSpecialCell)).toBe(false);
  });

  it('accepts a swapped cross wipe special and clears both its row and column', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'cross-wipe',
      powerTier: 5,
    };

    const result = resolveSwap(
      { board, score: 0, movesUsed: 2 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      { refill: createQueueRefill([2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.movesUsed).toBe(3);
    expect(result.cascadeCount).toBe(0);
    expect(result.clearedCells).toBe(13);
    expect(result.board.flat().some(isSpecialCell)).toBe(false);
  });

  it('accepts a swapped color clear special and clears every cell of the swapped fruit type', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'color-clear',
      powerTier: 7,
    };

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      { refill: createQueueRefill([4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.cascadeCount).toBe(0);
    expect(result.clearedCells).toBe(11);
    expect(result.board.flat().some(isSpecialCell)).toBe(false);
  });

  it('runs collapse, refill, and later cascades after a swapped special wipe', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [2, 0, 1, 2, 3, 4],
      [2, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };

    const result = resolveSwap(
      { board, score: 10, movesUsed: 4 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      { refill: createQueueRefill([4, 0, 1, 2, 3, 4, 4, 0, 1]) },
    );

    expect(result.accepted).toBe(true);
    expect(result.movesUsed).toBe(5);
    expect(result.cascadeCount).toBe(1);
    expect(result.clearedCells).toBe(9);
    expect(result.scoreDelta).toBe(30);
    expect(result.score).toBe(40);
    expect(result.board.map((row) => getCellFruit(row[0]))).toEqual([4, 0, 1, 4, 0, 1, 1, 2]);
  });

  it('when both swapped cells are special, the root clear chains into the other special when reached', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };
    board[3][3] = {
      type: 'special',
      fruit: 1,
      kind: 'cross-wipe',
      powerTier: 4,
    };

    const timeline: Parameters<NonNullable<Parameters<typeof resolveSwap>[2]['onTimelineEvent']>>[0][] = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      {
        refill: createQueueRefill(Array.from({ length: 80 }, (_, index) => (index % 4) + 1)),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );
    const specialWipes = timeline.filter((event) => event.type === 'special-wipe');

    expect(result.accepted).toBe(true);
    expect(result.clearedCells).toBeGreaterThanOrEqual(13);
    expect(specialWipes).toHaveLength(2);
    expect(specialWipes[0]).toMatchObject({
      origin: { row: 3, col: 3 },
      kind: 'row-wipe',
      triggerDelayMs: 0,
    });
    expect(specialWipes[1]).toMatchObject({
      origin: { row: 3, col: 2 },
      kind: 'cross-wipe',
      triggeredBy: { row: 3, col: 3 },
      triggerDelayMs: 90,
    });
  });

  it('chains specials hit by a directly swapped special clear', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };
    board[3][5] = {
      type: 'special',
      fruit: 3,
      kind: 'cross-wipe',
      powerTier: 5,
    };
    const timeline: Parameters<NonNullable<Parameters<typeof resolveSwap>[2]['onTimelineEvent']>>[0][] = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      {
        refill: createQueueRefill(Array.from({ length: 60 }, (_, index) => (index % 4) + 1)),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );
    const specialWipes = timeline.filter((event) => event.type === 'special-wipe');

    expect(result.accepted).toBe(true);
    expect(specialWipes).toHaveLength(2);
    expect(specialWipes[0]).toMatchObject({
      origin: { row: 3, col: 3 },
      kind: 'row-wipe',
      triggerDelayMs: 0,
    });
    expect(specialWipes[1]).toMatchObject({
      origin: { row: 3, col: 5 },
      kind: 'cross-wipe',
      triggeredBy: { row: 3, col: 3 },
      triggerDelayMs: 180,
    });
  });

  it('keeps match 3 resolution unchanged without creating special cells', () => {
    const board = createBoardFromRows([
      [4, 4, 4, 3, 4, 1],
      [2, 0, 3, 4, 1, 2],
      [1, 2, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    const result = resolveBoardMatches(
      { board, score: 0, movesUsed: 0 },
      { refill: createQueueRefill([1, 2, 3]) },
    );

    expect(result.cascadeCount).toBe(1);
    expect(result.clearedCells).toBe(3);
    expect(result.score).toBe(30);
    expect(result.board.flat().some(isSpecialCell)).toBe(false);
    expect(result.board[0].slice(0, 3).map(getCellFruit)).toEqual([1, 2, 3]);
  });

  it('emits ordered clear and drop timeline events without changing score behavior', () => {
    const board = createBoardFromRows([
      [4, 4, 4, 3, 4, 1],
      [2, 0, 3, 4, 1, 2],
      [1, 2, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const timeline: Parameters<NonNullable<Parameters<typeof resolveBoardMatches>[1]['onTimelineEvent']>>[0][] = [];

    const result = resolveBoardMatches(
      { board, score: 100, movesUsed: 2 },
      {
        refill: createQueueRefill([1, 2, 3]),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );

    expect(result.score).toBe(130);
    expect(timeline.map((event) => ({
      type: event.type,
      key: event.key,
      chain: event.chain,
      cause: event.cause,
      scoreTotal: event.type === 'clear' ? event.scoreTotal : undefined,
      dropCount: event.type === 'drop' ? event.dropMotions.length : undefined,
    }))).toEqual([
      {
        type: 'clear',
        key: 0,
        chain: 1,
        cause: 'cascade',
        scoreTotal: 130,
        dropCount: undefined,
      },
      {
        type: 'drop',
        key: 1,
        chain: 1,
        cause: 'cascade',
        scoreTotal: undefined,
        dropCount: 3,
      },
    ]);
    expect(timeline[0].type === 'clear' && timeline[0].board[0][0]).not.toBe(board[0][0]);
    expect(timeline[0].type === 'clear' && timeline[0].clearedBoard[1][0]).not.toBe(board[1][0]);
    expect(timeline[1].type === 'drop' && timeline[1].settledBoard[0][0]).not.toBe(result.board[0][0]);
  });

  it('emits special creation timeline metadata for long-match merges', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [0, 0, 0, 3, 0, 4],
    ]);
    const timeline: Parameters<NonNullable<Parameters<typeof resolveSwap>[2]['onTimelineEvent']>>[0][] = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 7, col: 4 }, to: { row: 7, col: 3 } },
      {
        refill: createQueueRefill([1, 2, 3, 4, 0, 1, 2, 3]),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );

    expect(result.accepted).toBe(true);
    expect(timeline[0]).toEqual({
      type: 'clear',
      key: 0,
      chain: 1,
      cause: 'swap',
      board: createBoardFromRows([
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
        [3, 4, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [0, 0, 0, 0, 3, 4],
      ]),
      clearedBoard: [
        [
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
        ],
        [
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
        ],
        [
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
        ],
        [
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
        ],
        [
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
        ],
        [
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
        ],
        [
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
        ],
        [
          null,
          null,
          null,
          { type: 'special', fruit: 0, kind: 'row-wipe', powerTier: 4 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
        ],
      ],
      clearedCells: [],
      matches: [],
      scoreDelta: 60,
      scoreTotal: 60,
    });
    expect(timeline[1]).toEqual({
      type: 'special-create',
      key: 1,
      chain: 1,
      cause: 'swap',
      board: createBoardFromRows([
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
        [3, 4, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [0, 0, 0, 0, 3, 4],
      ]),
      fruit: 0,
      sourceCells: [
        { row: 7, col: 0 },
        { row: 7, col: 1 },
        { row: 7, col: 2 },
      ],
      targetCell: { row: 7, col: 3 },
      special: {
        type: 'special',
        fruit: 0,
        kind: 'row-wipe',
        powerTier: 4,
      },
    });
  });

  it('emits special wipe timeline metadata when a swapped special activates', () => {
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
    board[3][2] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };
    const timeline: Parameters<NonNullable<Parameters<typeof resolveSwap>[2]['onTimelineEvent']>>[0][] = [];

    const result = resolveSwap(
      { board, score: 0, movesUsed: 0 },
      { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
      {
        refill: createQueueRefill([4, 0, 1, 2, 3, 4]),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );

    expect(result.accepted).toBe(true);
    expect(timeline[0]).toMatchObject({
      type: 'special-wipe',
      key: 0,
      chain: 0,
      cause: 'swap',
      board: createBoardFromRows([
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
        [3, 4, 1, 0, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
      ]).map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          rowIndex === 3 && colIndex === 3
            ? {
                type: 'special' as const,
                fruit: 0,
                kind: 'row-wipe' as const,
                powerTier: 4 as const,
              }
            : cell,
        ),
      ),
      origin: { row: 3, col: 3 },
      kind: 'row-wipe',
      cells: [
        { row: 3, col: 3 },
        { row: 3, col: 0 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
      ],
    });
    expect(timeline[1]).toEqual({
      type: 'drop',
      key: 1,
      chain: 0,
      cause: 'swap',
      board: [
        [
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
        ],
        [
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
        ],
        [
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
        ],
        [null, null, null, null, null, null],
        [
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
        ],
        [
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
        ],
        [
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
        ],
        [
          { type: 'fruit', fruit: 2 },
          { type: 'fruit', fruit: 3 },
          { type: 'fruit', fruit: 4 },
          { type: 'fruit', fruit: 0 },
          { type: 'fruit', fruit: 1 },
          { type: 'fruit', fruit: 2 },
        ],
      ],
      settledBoard: createBoardFromRows([
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
        [1, 2, 3, 4, 0, 1],
        [2, 3, 4, 0, 1, 2],
      ]),
      dropMotions: [
        {
          fruit: 4,
          from: { row: -1, col: 0 },
          to: { row: 0, col: 0 },
          spawned: true,
        },
        {
          fruit: 0,
          from: { row: 0, col: 0 },
          to: { row: 1, col: 0 },
          spawned: false,
        },
        {
          fruit: 1,
          from: { row: 1, col: 0 },
          to: { row: 2, col: 0 },
          spawned: false,
        },
        {
          fruit: 2,
          from: { row: 2, col: 0 },
          to: { row: 3, col: 0 },
          spawned: false,
        },
        {
          fruit: 0,
          from: { row: -1, col: 1 },
          to: { row: 0, col: 1 },
          spawned: true,
        },
        {
          fruit: 1,
          from: { row: 0, col: 1 },
          to: { row: 1, col: 1 },
          spawned: false,
        },
        {
          fruit: 2,
          from: { row: 1, col: 1 },
          to: { row: 2, col: 1 },
          spawned: false,
        },
        {
          fruit: 3,
          from: { row: 2, col: 1 },
          to: { row: 3, col: 1 },
          spawned: false,
        },
        {
          fruit: 1,
          from: { row: -1, col: 2 },
          to: { row: 0, col: 2 },
          spawned: true,
        },
        {
          fruit: 2,
          from: { row: 0, col: 2 },
          to: { row: 1, col: 2 },
          spawned: false,
        },
        {
          fruit: 3,
          from: { row: 1, col: 2 },
          to: { row: 2, col: 2 },
          spawned: false,
        },
        {
          fruit: 4,
          from: { row: 2, col: 2 },
          to: { row: 3, col: 2 },
          spawned: false,
        },
        {
          fruit: 2,
          from: { row: -1, col: 3 },
          to: { row: 0, col: 3 },
          spawned: true,
        },
        {
          fruit: 3,
          from: { row: 0, col: 3 },
          to: { row: 1, col: 3 },
          spawned: false,
        },
        {
          fruit: 4,
          from: { row: 1, col: 3 },
          to: { row: 2, col: 3 },
          spawned: false,
        },
        {
          fruit: 0,
          from: { row: 2, col: 3 },
          to: { row: 3, col: 3 },
          spawned: false,
        },
        {
          fruit: 3,
          from: { row: -1, col: 4 },
          to: { row: 0, col: 4 },
          spawned: true,
        },
        {
          fruit: 4,
          from: { row: 0, col: 4 },
          to: { row: 1, col: 4 },
          spawned: false,
        },
        {
          fruit: 0,
          from: { row: 1, col: 4 },
          to: { row: 2, col: 4 },
          spawned: false,
        },
        {
          fruit: 1,
          from: { row: 2, col: 4 },
          to: { row: 3, col: 4 },
          spawned: false,
        },
        {
          fruit: 4,
          from: { row: -1, col: 5 },
          to: { row: 0, col: 5 },
          spawned: true,
        },
        {
          fruit: 0,
          from: { row: 0, col: 5 },
          to: { row: 1, col: 5 },
          spawned: false,
        },
        {
          fruit: 1,
          from: { row: 1, col: 5 },
          to: { row: 2, col: 5 },
          spawned: false,
        },
        {
          fruit: 2,
          from: { row: 2, col: 5 },
          to: { row: 3, col: 5 },
          spawned: false,
        },
      ],
    });
  });

  it.each([
    {
      kind: 'row-wipe' as const,
      powerTier: 4 as const,
      expectedCells: [
        { row: 3, col: 1 },
        { row: 3, col: 0 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
      ],
    },
    {
      kind: 'column-wipe' as const,
      powerTier: 4 as const,
      expectedCells: [
        { row: 3, col: 1 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 4, col: 1 },
        { row: 5, col: 1 },
        { row: 6, col: 1 },
        { row: 7, col: 1 },
      ],
    },
    {
      kind: 'cross-wipe' as const,
      powerTier: 5 as const,
      expectedCells: [
        { row: 3, col: 1 },
        { row: 3, col: 0 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 4, col: 1 },
        { row: 5, col: 1 },
        { row: 6, col: 1 },
        { row: 7, col: 1 },
      ],
    },
    {
      kind: 'color-clear' as const,
      powerTier: 7 as const,
      expectedCells: [
        { row: 3, col: 1 },
        { row: 0, col: 0 },
        { row: 0, col: 5 },
        { row: 1, col: 4 },
        { row: 2, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 4, col: 1 },
        { row: 5, col: 0 },
        { row: 5, col: 5 },
        { row: 6, col: 4 },
        { row: 7, col: 3 },
      ],
    },
  ])('activates an existing $kind special when it participates in a regular match', ({ kind, powerTier, expectedCells }) => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [4, 0, 0, 0, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    board[3][1] = {
      type: 'special',
      fruit: 0,
      kind,
      powerTier,
    };
    const timeline: Parameters<NonNullable<Parameters<typeof resolveBoardMatches>[1]['onTimelineEvent']>>[0][] = [];

    resolveBoardMatches(
      { board, score: 0, movesUsed: 0 },
      {
        refill: createQueueRefill(Array.from({ length: 40 }, (_, index) => (index % 4) + 1)),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );

    expect(timeline[0]).toMatchObject({
      type: 'clear',
      chain: 1,
      clearedCells: [
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
      ],
    });
    expect(timeline[1]).toMatchObject({
      type: 'special-wipe',
      chain: 1,
      cause: 'cascade',
      origin: { row: 3, col: 1 },
      kind,
      cells: expectedCells,
    });
  });

  it('chains every special hit by an active row clear at the moment the clear reaches it', () => {
    const board = createBoardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [4, 0, 0, 0, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    board[3][1] = {
      type: 'special',
      fruit: 0,
      kind: 'row-wipe',
      powerTier: 4,
    };
    board[3][4] = {
      type: 'special',
      fruit: 2,
      kind: 'cross-wipe',
      powerTier: 5,
    };
    board[3][5] = {
      type: 'special',
      fruit: 3,
      kind: 'color-clear',
      powerTier: 7,
    };
    const timeline: Parameters<NonNullable<Parameters<typeof resolveBoardMatches>[1]['onTimelineEvent']>>[0][] = [];

    resolveBoardMatches(
      { board, score: 0, movesUsed: 0 },
      {
        refill: createQueueRefill(Array.from({ length: 80 }, (_, index) => (index % 4) + 1)),
        onTimelineEvent: (event) => {
          timeline.push(event);
        },
      },
    );

    const specialWipes = timeline.filter((event) => event.type === 'special-wipe');

    expect(specialWipes).toHaveLength(3);
    expect(specialWipes[0]).toMatchObject({
      origin: { row: 3, col: 1 },
      kind: 'row-wipe',
      triggerDelayMs: 0,
      cells: [
        { row: 3, col: 1 },
        { row: 3, col: 0 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
      ],
    });
    expect(specialWipes[1]).toMatchObject({
      origin: { row: 3, col: 4 },
      kind: 'cross-wipe',
      triggeredBy: { row: 3, col: 1 },
      triggerDelayMs: 270,
    });
    expect(specialWipes[2]).toMatchObject({
      origin: { row: 3, col: 5 },
      kind: 'color-clear',
      triggeredBy: { row: 3, col: 1 },
      triggerDelayMs: 360,
    });
  });

  it('detects dead boards and applies a caller-provided reshuffle hook', () => {
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
    const reshuffled = createBoardFromRows([
      [0, 1, 0, 3, 4, 1],
      [2, 0, 3, 4, 1, 2],
      [1, 2, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const calls: string[] = [];

    const result = ensurePlayableBoard(deadBoard, {
      reshuffle: () => reshuffled,
      onDeadBoard: () => calls.push('dead'),
      onReshuffle: () => calls.push('reshuffle'),
    });

    expect(result.wasDeadBoard).toBe(true);
    expect(result.wasReshuffled).toBe(true);
    expect(result.board).toEqual(reshuffled);
    expect(calls).toEqual(['dead', 'reshuffle']);
    expect(hasAvailableMoves(result.board)).toBe(true);
  });

  it('reports reshuffle data when board resolution ends on a dead board', () => {
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
    const reshuffled = createBoardFromRows([
      [0, 1, 0, 3, 4, 1],
      [2, 0, 3, 4, 1, 2],
      [1, 2, 4, 1, 2, 3],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);

    const result = resolveBoardMatches(
      { board: deadBoard, score: 0, movesUsed: 0 },
      {
        refill: createQueueRefill([]),
        reshuffle: () => reshuffled,
      },
    );

    expect(result.board).toEqual(reshuffled);
    expect(result.reshuffle).toEqual({
      before: deadBoard,
      after: reshuffled,
    });
  });

  it('tracks timed-round progress with helper snapshots', () => {
    const timer = createTimer(60_000, 10_000);

    expect(getTimerSnapshot(timer, 10_000)).toEqual({
      durationMs: 60_000,
      elapsedMs: 0,
      remainingMs: 60_000,
      expired: false,
      progress: 0,
    });
    expect(getTimerSnapshot(timer, 55_000)).toEqual({
      durationMs: 60_000,
      elapsedMs: 45_000,
      remainingMs: 15_000,
      expired: false,
      progress: 0.75,
    });
    expect(getTimerSnapshot(timer, 75_000)).toEqual({
      durationMs: 60_000,
      elapsedMs: 60_000,
      remainingMs: 0,
      expired: true,
      progress: 1,
    });
  });
});
