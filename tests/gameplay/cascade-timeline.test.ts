import { describe, expect, it } from 'vitest';

import { createFruitCell } from '../../src/game/board';
import { createCascadeTimeline } from '../../src/gameplay/cascade-timeline';
import type { Board, ScoreEvent } from '../../src/game/types';

function boardFromRows(rows: number[][]): Board {
  return rows.map((row) => row.map(createFruitCell));
}

describe('cascade timeline', () => {
  it('creates ordered clear and drop jobs for each score event', () => {
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
          {
            fruit: 7,
            from: { row: -1, col: 2 },
            to: { row: 0, col: 2 },
            spawned: true,
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

    expect(createCascadeTimeline(500, events)).toEqual([
      {
        kind: 'clear',
        key: 500,
        chain: 1,
        board,
        matches: events[0].matches,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        cleared: 3,
        points: 30,
        total: 30,
      },
      {
        kind: 'drop',
        key: 501,
        chain: 1,
        board,
        settledBoard,
        motions: events[0].dropMotions,
        columns: [0, 2],
        maxDistance: 1,
        spawnedCount: 1,
      },
    ]);
  });

  it('keeps chains grouped in event order across multiple cascades', () => {
    const boardA = boardFromRows([
      [0, 0, 0],
      [1, 2, 3],
      [4, 5, 6],
    ]);
    const boardB = boardFromRows([
      [1, 2, 3],
      [4, 5, 6],
      [2, 2, 2],
    ]);
    const settledA = boardFromRows([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    const settledB = boardFromRows([
      [1, 4, 7],
      [3, 5, 6],
      [8, 9, 1],
    ]);

    const timeline = createCascadeTimeline(100, [
      {
        chain: 1,
        cleared: 3,
        points: 30,
        total: 30,
        board: boardA,
        settledBoard: settledA,
        dropMotions: [],
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
      {
        chain: 2,
        cleared: 3,
        points: 60,
        total: 90,
        board: boardB,
        settledBoard: settledB,
        dropMotions: [
          {
            fruit: 4,
            from: { row: 0, col: 1 },
            to: { row: 2, col: 1 },
            spawned: false,
          },
        ],
        matches: [
          {
            axis: 'row',
            fruit: 2,
            size: 3,
            tier: 3,
            cells: [
              { row: 2, col: 0 },
              { row: 2, col: 1 },
              { row: 2, col: 2 },
            ],
          },
        ],
      },
    ]);

    expect(timeline.map((job) => [job.kind, job.key, job.chain])).toEqual([
      ['clear', 100, 1],
      ['drop', 101, 1],
      ['clear', 102, 2],
      ['drop', 103, 2],
    ]);
  });
});
