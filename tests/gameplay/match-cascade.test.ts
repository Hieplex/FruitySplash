import { describe, expect, it } from 'vitest';

import { createQueueRefill } from '../../src/game/gravity';
import { createMatchSteps, resolveBombClearSequence } from '../../src/gameplay/match-cascade';
import type { Board, ScoreEvent } from '../../src/game/types';

describe('match cascade sequencing', () => {
  it('turns score events into splash/drop steps keyed by cascade order', () => {
    const board: Board = [
      [0, 0, 0],
      [1, 2, 3],
      [4, 1, 2],
    ];
    const settledBoard: Board = [
      [1, 2, 3],
      [4, 1, 2],
      [0, 1, 2],
    ];
    const events: ScoreEvent[] = [
      {
        chain: 1,
        cleared: 3,
        points: 30,
        total: 30,
        board,
        settledBoard,
        dropMotions: [
          {
            fruit: 1,
            from: { row: 1, col: 0 },
            to: { row: 0, col: 0 },
            spawned: false,
          },
        ],
        matches: [
          {
            axis: 'row',
            fruit: 0,
            cells: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
          },
        ],
      },
    ];

    expect(createMatchSteps(500, events)).toEqual([
      {
        board,
        settledBoard,
        dropMotions: events[0].dropMotions,
        splash: {
          key: 500,
          chain: 1,
          cells: [
            { row: 0, col: 0, fruit: 0 },
            { row: 0, col: 1, fruit: 0 },
            { row: 0, col: 2, fruit: 0 },
          ],
        },
      },
    ]);
  });

  it('prepares bomb clear collapse and follow-up cascade without double-counting bomb score', () => {
    const board: Board = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 4, 4],
    ];

    const result = resolveBombClearSequence({
      key: 900,
      target: { row: 1, col: 1 },
      board,
      engineState: { board, score: 100, movesUsed: 2 },
      refill: createQueueRefill([4, 4, 4, 0, 1, 2, 3, 4, 0]),
      cascadeRefill: createQueueRefill([0, 1, 2]),
    });

    expect(result.blastCells).toEqual([
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
    expect(result.dropAnimation).toEqual({
      key: 900,
      motions: result.clearedDropMotions,
      hiddenCells: result.blastCells,
    });
    expect(result.state.score).toBe(220);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].splash.key).toBe(901);
    expect(result.steps[0].splash.cells).toEqual([
      { row: 0, col: 0, fruit: 4 },
      { row: 1, col: 0, fruit: 4 },
      { row: 2, col: 0, fruit: 4 },
    ]);
  });
});
