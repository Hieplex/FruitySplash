import { describe, expect, it } from 'vitest';

import { buildDropMotionTimings } from '../../src/gameplay/drop-timing';
import type { DropMotion } from '../../src/game/types';

describe('drop timing', () => {
  it('stagger columns while keeping one total duration for the batch', () => {
    const motions: DropMotion[] = [
      {
        fruit: 1,
        from: { row: 1, col: 0 },
        to: { row: 3, col: 0 },
        spawned: false,
      },
      {
        fruit: 2,
        from: { row: 2, col: 2 },
        to: { row: 4, col: 2 },
        spawned: false,
      },
    ];

    const schedule = buildDropMotionTimings(motions);

    expect(schedule.timings).toHaveLength(2);
    expect(schedule.timings[1].startMs).toBeGreaterThan(schedule.timings[0].startMs);
    expect(schedule.totalDurationMs).toBe(schedule.timings[1].endMs);
  });

  it('gives longer travel a later or equal start and a later end', () => {
    const motions: DropMotion[] = [
      {
        fruit: 1,
        from: { row: 1, col: 0 },
        to: { row: 2, col: 0 },
        spawned: false,
      },
      {
        fruit: 2,
        from: { row: -2, col: 0 },
        to: { row: 2, col: 0 },
        spawned: true,
      },
    ];

    const schedule = buildDropMotionTimings(motions);

    expect(schedule.timings[1].startMs).toBeGreaterThanOrEqual(schedule.timings[0].startMs);
    expect(schedule.timings[1].endMs).toBeGreaterThan(schedule.timings[0].endMs);
  });

  it('adds per-column clear delays before a column begins dropping', () => {
    const motions: DropMotion[] = [
      {
        fruit: 1,
        from: { row: 1, col: 0 },
        to: { row: 3, col: 0 },
        spawned: false,
      },
      {
        fruit: 2,
        from: { row: 1, col: 1 },
        to: { row: 3, col: 1 },
        spawned: false,
      },
    ];

    const schedule = buildDropMotionTimings(motions, {
      startDelaysByColumn: {
        0: 120,
        1: 360,
      },
    });

    expect(schedule.timings[0].startMs).toBeGreaterThanOrEqual(120);
    expect(schedule.timings[1].startMs).toBeGreaterThanOrEqual(360);
    expect(schedule.timings[1].startMs - schedule.timings[0].startMs).toBeGreaterThanOrEqual(200);
  });
});
