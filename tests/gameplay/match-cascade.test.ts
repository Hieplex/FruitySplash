import { describe, expect, it } from 'vitest';

import { createFruitCell } from '../../src/game/board';
import { createQueueRefill } from '../../src/game/gravity';
import {
  createCascadeSequenceJobsFromTimeline,
  createMatchSteps,
  resolveBombClearSequence,
  resolveDirectSpecialPowerSequence,
} from '../../src/gameplay/match-cascade';
import type { Board, CascadeTimelineEvent, NullableBoard, ScoreEvent } from '../../src/game/types';

function boardFromRows(rows: number[][]): Board {
  return rows.map((row) => row.map(createFruitCell));
}

function nullableBoardFromRows(rows: Array<Array<number | null>>): NullableBoard {
  return rows.map((row) => row.map((fruit) => (fruit === null ? null : createFruitCell(fruit))));
}

describe('match cascade sequencing', () => {
  it('turns score events into splash/drop steps keyed by cascade order', () => {
    const board = boardFromRows([
      [0, 0, 0],
      [1, 2, 3],
      [4, 1, 2],
    ]);
    const settledBoard = boardFromRows([
      [1, 2, 3],
      [4, 1, 2],
      [0, 1, 2],
    ]);
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
            size: 3,
            tier: 3,
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
          durationMs: 240,
          preShrinkMs: 70,
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
    const board = boardFromRows([
      [1, 2, 3],
      [1, 2, 3],
      [1, 4, 4],
    ]);

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
    expect(result.jobs[0]).toEqual({
      type: 'drop',
      key: 900,
      board,
      motions: result.clearedDropMotions,
      hiddenCells: result.blastCells,
    });
    expect(result.jobs[1].type).toBe('splash');
    expect(result.jobs[1]).toMatchObject({
      type: 'splash',
      overlappedDrop: {
        motions: result.steps[0].dropMotions,
      },
    });
    expect(result.steps[0].splash.key).toBe(901);
    expect(result.steps[0].splash.cells).toEqual([
      { row: 0, col: 0, fruit: 4 },
      { row: 1, col: 0, fruit: 4 },
      { row: 2, col: 0, fruit: 4 },
    ]);
  });

  it('turns timeline clear/drop events into sequence jobs in order', () => {
    const board = boardFromRows([
      [0, 0, 0],
      [1, 2, 3],
      [4, 1, 2],
    ]);
    const settledBoard = boardFromRows([
      [1, 2, 3],
      [4, 1, 2],
      [0, 1, 2],
    ]);
    const events: CascadeTimelineEvent[] = [
      {
        type: 'clear',
        key: 10,
        chain: 1,
        cause: 'swap',
        board,
        clearedBoard: nullableBoardFromRows([
          [null, null, null],
          [1, 2, 3],
          [4, 1, 2],
        ]),
        clearedCells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        matches: [
          {
            axis: 'row',
            fruit: 0,
            size: 3,
            tier: 3,
            cells: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
          },
        ],
        scoreDelta: 30,
        scoreTotal: 30,
      },
      {
        type: 'drop',
        key: 11,
        chain: 1,
        cause: 'swap',
        board: nullableBoardFromRows([
          [null, null, null],
          [1, 2, 3],
          [4, 1, 2],
        ]),
        settledBoard,
        dropMotions: [
          {
            fruit: 1,
            from: { row: 1, col: 0 },
            to: { row: 0, col: 0 },
            spawned: false,
          },
        ],
      },
    ];

    const dropEvent = events[1];

    expect(createCascadeSequenceJobsFromTimeline(events)).toEqual([
      {
        type: 'splash',
        key: 10,
        board: settledBoard,
        splash: {
          key: 10,
          chain: 1,
          durationMs: 240,
          preShrinkMs: 70,
          cells: [
            { row: 0, col: 0, fruit: 0 },
            { row: 0, col: 1, fruit: 0 },
            { row: 0, col: 2, fruit: 0 },
          ],
        },
        overlappedDrop: {
          key: 11,
          board: settledBoard,
          motions: dropEvent.type === 'drop' ? dropEvent.dropMotions : [],
          hiddenCells: undefined,
          startDelaysByColumn: {
            0: 70,
            1: 70,
            2: 70,
          },
        },
      },
    ]);
  });

  it('prepares direct special power clears as wipe then drop jobs', () => {
    const board = boardFromRows([
      [0, 1, 2],
      [1, 2, 3],
      [2, 1, 0],
    ]);

    const line = resolveDirectSpecialPowerSequence({
      key: 600,
      target: { row: 1, col: 1 },
      tool: 'lineRocket',
      kind: 'row-wipe',
      board,
      engineState: { board, score: 50, movesUsed: 1 },
      refill: createQueueRefill([4, 3, 2, 1, 0]),
      cascadeRefill: createQueueRefill([0, 1, 2]),
    });

    expect(line.clearCells).toEqual([
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
    expect(line.jobs[0]).toMatchObject({
      type: 'special-wipe',
      key: 600,
      origin: { row: 1, col: 1 },
      kind: 'row-wipe',
      sourceTool: 'lineRocket',
      rowTravelDirection: 'left-to-right',
      cells: line.clearCells,
    });

    const lineFromRight = resolveDirectSpecialPowerSequence({
      key: 650,
      target: { row: 1, col: 2 },
      tool: 'lineRocket',
      kind: 'row-wipe',
      board,
      engineState: { board, score: 50, movesUsed: 1 },
      refill: createQueueRefill([4, 3, 2, 1, 0]),
      cascadeRefill: createQueueRefill([0, 1, 2]),
    });

    expect(lineFromRight.clearCells).toEqual([
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
    ]);
    expect(lineFromRight.jobs[0]).toMatchObject({
      type: 'special-wipe',
      sourceTool: 'lineRocket',
      rowTravelDirection: 'right-to-left',
      cells: lineFromRight.clearCells,
    });

    const cross = resolveDirectSpecialPowerSequence({
      key: 700,
      target: { row: 1, col: 1 },
      tool: 'fruityCross',
      kind: 'cross-wipe',
      board,
      engineState: { board, score: 50, movesUsed: 1 },
      refill: createQueueRefill([4, 3, 2, 1, 0]),
      cascadeRefill: createQueueRefill([0, 1, 2]),
    });

    expect(cross.clearCells).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 0, col: 1 },
      { row: 2, col: 1 },
    ]);
    expect(cross.jobs[0]).toMatchObject({
      type: 'special-wipe',
      key: 700,
      origin: { row: 1, col: 1 },
      kind: 'cross-wipe',
      sourceTool: 'fruityCross',
      cells: cross.clearCells,
    });
    expect(cross.jobs[1]).toMatchObject({
      type: 'drop',
      key: 701,
      board: cross.settledBoard,
      hiddenCells: undefined,
    });

    const colorClear = resolveDirectSpecialPowerSequence({
      key: 800,
      target: { row: 1, col: 1 },
      kind: 'color-clear',
      board,
      engineState: { board, score: 50, movesUsed: 1 },
      refill: createQueueRefill([4, 3, 2, 1, 0]),
      cascadeRefill: createQueueRefill([0, 1, 2]),
    });

    expect(colorClear.targetFruit).toBe(2);
    expect(colorClear.clearCells).toEqual([
      { row: 1, col: 1 },
      { row: 0, col: 2 },
      { row: 2, col: 0 },
    ]);
  });

  it('turns special timeline events into merge and wipe sequence jobs', () => {
    const board = boardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const settledBoard = boardFromRows([
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
    ]);
    const events: CascadeTimelineEvent[] = [
      {
        type: 'special-create',
        key: 20,
        chain: 1,
        cause: 'swap',
        board,
        fruit: 0,
        sourceCells: [
          { row: 7, col: 0 },
          { row: 7, col: 2 },
          { row: 7, col: 3 },
        ],
        targetCell: { row: 7, col: 1 },
        special: {
          type: 'special',
          fruit: 0,
          kind: 'row-wipe',
          powerTier: 4,
        },
      },
      {
        type: 'special-wipe',
        key: 21,
        chain: 1,
        cause: 'swap',
        board,
        origin: { row: 3, col: 2 },
        kind: 'column-wipe',
        cells: [
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
          { row: 3, col: 2 },
          { row: 4, col: 2 },
          { row: 5, col: 2 },
          { row: 6, col: 2 },
          { row: 7, col: 2 },
        ],
      },
      {
        type: 'drop',
        key: 22,
        chain: 1,
        cause: 'swap',
        board: nullableBoardFromRows([
          [0, 1, null, 3, 4, 0],
          [1, 2, null, 4, 0, 1],
          [2, 3, null, 0, 1, 2],
          [3, 4, null, 1, 2, 3],
          [4, 0, null, 2, 3, 4],
          [0, 1, null, 3, 4, 0],
          [1, 2, null, 4, 0, 1],
          [2, 3, null, 0, 1, 2],
        ]),
        settledBoard,
        dropMotions: [
          {
            fruit: 4,
            from: { row: -1, col: 2 },
            to: { row: 0, col: 2 },
            spawned: true,
          },
        ],
      },
    ];

    expect(createCascadeSequenceJobsFromTimeline(events)).toEqual([
      {
        type: 'special-merge',
        key: 20,
        board,
        fruit: 0,
        sourceCells: [
          { row: 7, col: 0 },
          { row: 7, col: 2 },
          { row: 7, col: 3 },
        ],
        targetCell: { row: 7, col: 1 },
        special: {
          type: 'special',
          fruit: 0,
          kind: 'row-wipe',
          powerTier: 4,
        },
        companionSplash: undefined,
        hiddenCells: undefined,
      },
      {
        type: 'special-wipe',
        key: 21,
        board,
        origin: { row: 3, col: 2 },
        kind: 'column-wipe',
        cells: [
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
          { row: 3, col: 2 },
          { row: 4, col: 2 },
          { row: 5, col: 2 },
          { row: 6, col: 2 },
          { row: 7, col: 2 },
        ],
        targetFruit: undefined,
      },
      {
        type: 'drop',
        key: 22,
        board: settledBoard,
        motions: [
          {
            fruit: 4,
            from: { row: -1, col: 2 },
            to: { row: 0, col: 2 },
            spawned: true,
          },
        ],
        hiddenCells: undefined,
        startDelaysByColumn: undefined,
      },
    ]);
  });

  it('skips splash jobs for long-match clear events that are fully replaced by a special merge', () => {
    const board = boardFromRows([
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [2, 3, 4, 0, 1, 2],
      [3, 4, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 0],
      [1, 2, 3, 4, 0, 1],
      [0, 0, 0, 0, 3, 4],
    ]);
    const settledBoard = boardFromRows([
      [1, 2, 3, 3, 4, 0],
      [0, 1, 2, 4, 0, 1],
      [1, 2, 3, 0, 1, 2],
      [2, 3, 4, 1, 2, 3],
      [3, 4, 0, 2, 3, 4],
      [4, 0, 1, 3, 4, 0],
      [0, 1, 2, 4, 0, 1],
      [1, 2, 3, 0, 3, 4],
    ]);

    const events: CascadeTimelineEvent[] = [
      {
        type: 'clear',
        key: 30,
        chain: 1,
        cause: 'swap',
        board,
        clearedBoard: nullableBoardFromRows([
          [0, 1, 2, 3, 4, 0],
          [1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2],
          [3, 4, 0, 1, 2, 3],
          [4, 0, 1, 2, 3, 4],
          [0, 1, 2, 3, 4, 0],
          [1, 2, 3, 4, 0, 1],
          [null, null, null, 0, 3, 4],
        ]),
        clearedCells: [],
        matches: [],
        scoreDelta: 60,
        scoreTotal: 60,
      },
      {
        type: 'special-create',
        key: 31,
        chain: 1,
        cause: 'swap',
        board,
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
      },
      {
        type: 'drop',
        key: 32,
        chain: 1,
        cause: 'swap',
        board: nullableBoardFromRows([
          [0, 1, 2, 3, 4, 0],
          [1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2],
          [3, 4, 0, 1, 2, 3],
          [4, 0, 1, 2, 3, 4],
          [0, 1, 2, 3, 4, 0],
          [1, 2, 3, 4, 0, 1],
          [null, null, null, 0, 3, 4],
        ]),
        settledBoard,
        dropMotions: [
          {
            fruit: 1,
            from: { row: -1, col: 0 },
            to: { row: 0, col: 0 },
            spawned: true,
          },
        ],
      },
    ];

    expect(createCascadeSequenceJobsFromTimeline(events)).toEqual([
      {
        type: 'special-merge',
        key: 31,
        board,
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
      },
      {
        type: 'drop',
        key: 32,
        board: settledBoard,
        motions: [
          {
            fruit: 1,
            from: { row: -1, col: 0 },
            to: { row: 0, col: 0 },
            spawned: true,
          },
        ],
        hiddenCells: undefined,
      },
    ]);
  });
});
