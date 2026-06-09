import type { DropMotion } from '@/game/types';

export type DropMotionTiming = {
  startMs: number;
  durationMs: number;
  endMs: number;
};

type DropMotionTimingOptions = {
  startDelaysByColumn?: Record<number, number>;
};

const DROP_MIN_DURATION_MS = 250;
const DROP_DISTANCE_DURATION_MS = 36;
const DROP_MAX_DURATION_MS = 420;
const DROP_COLUMN_STAGGER_MS = 26;
const DROP_DISTANCE_STAGGER_MS = 8;
const DROP_MOTION_MIN_DURATION_MS = 150;

export function buildDropMotionTimings(motions: DropMotion[], options: DropMotionTimingOptions = {}) {
  if (motions.length === 0) {
    return {
      totalDurationMs: 0,
      timings: [] as DropMotionTiming[],
    };
  }

  const columns = [...new Set(motions.map((motion) => motion.to.col))].sort((left, right) => left - right);
  const maxDistance = motions.reduce(
    (current, motion) => Math.max(current, Math.abs(motion.to.row - motion.from.row)),
    1,
  );
  const baseDurationMs = Math.min(
    DROP_MAX_DURATION_MS,
    DROP_MIN_DURATION_MS + maxDistance * DROP_DISTANCE_DURATION_MS,
  );

  const timings = motions.map((motion) => {
    const columnIndex = Math.max(0, columns.indexOf(motion.to.col));
    const distance = Math.max(1, Math.abs(motion.to.row - motion.from.row));
    const columnClearDelayMs = Math.max(0, options.startDelaysByColumn?.[motion.to.col] ?? 0);
    const startMs =
      columnClearDelayMs + columnIndex * DROP_COLUMN_STAGGER_MS + (distance - 1) * DROP_DISTANCE_STAGGER_MS;
    const durationMs = Math.max(DROP_MOTION_MIN_DURATION_MS, baseDurationMs - columnIndex * 12);
    const endMs = startMs + durationMs;

    return {
      startMs,
      durationMs,
      endMs,
    };
  });

  return {
    totalDurationMs: timings.reduce((current, timing) => Math.max(current, timing.endMs), 0),
    timings,
  };
}
