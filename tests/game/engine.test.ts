import { describe, expect, it } from 'vitest';

import { createBoardFromRows, hasAvailableMoves } from '../../src/game/board';
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
      board: number[][];
      settledBoard: number[][];
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
    expect(events[1].board.map((row) => row[0])).toEqual([4, 4, 4, 2, 3, 4, 1, 2]);
    expect(events[1].settledBoard.map((row) => row[0])).toEqual([1, 2, 3, 2, 3, 4, 1, 2]);
    expect(result.board.map((row) => row[0])).toEqual([1, 2, 3, 2, 3, 4, 1, 2]);
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
    const events: Array<{ chain: number; points: number; total: number; board: number[][] }> = [];

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
    expect(result.board[0].slice(0, 3)).toEqual([1, 2, 3]);
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
