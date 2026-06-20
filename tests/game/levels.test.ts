import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import {
  DIFFICULTY_BANDS,
  validateLevelCollection,
} from '../../src/game/levels/schema';
import { LEVELS } from '../../src/game/levels/levels';

describe('Fruity Splash level catalog', () => {
  it('defines exactly 120 sequential levels', () => {
    expect(LEVELS).toHaveLength(120);
    expect(LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: 120 }, (_, index) => index + 1),
    );
  });

  it('keeps every level inside the schema constraints', () => {
    expect(() => validateLevelCollection(LEVELS)).not.toThrow();
  });

  it('uses the expected ascending difficulty bands', () => {
    expect(DIFFICULTY_BANDS).toEqual([
      'gentle-onboarding',
      'rising-pressure',
      'tighter-timer',
      'hard-release',
    ]);

    const ranges = [
      { start: 1, end: 20, band: 'gentle-onboarding' },
      { start: 21, end: 50, band: 'rising-pressure' },
      { start: 51, end: 80, band: 'tighter-timer' },
      { start: 81, end: 120, band: 'hard-release' },
    ] as const;

    for (const range of ranges) {
      const slice = LEVELS.slice(range.start - 1, range.end);
      expect(slice.every((level) => level.difficultyBand === range.band)).toBe(
        true,
      );
    }
  });

  it('keeps timers and pressure trending upward by band', () => {
    const byBand = DIFFICULTY_BANDS.map((band) =>
      LEVELS.filter((level) => level.difficultyBand === band),
    );

    const averageTimeLimits = byBand.map(
      (levels) =>
        levels.reduce((total, level) => total + level.timeLimitSeconds, 0) /
        levels.length,
    );

    const averageTargetPerSecond = byBand.map(
      (levels) =>
        levels.reduce(
          (total, level) => total + level.metadata.targetPerSecond,
          0,
        ) / levels.length,
    );

    expect(averageTimeLimits[0]).toBeGreaterThan(averageTimeLimits[1]);
    expect(averageTimeLimits[1]).toBeGreaterThan(averageTimeLimits[2]);
    expect(averageTimeLimits[2]).toBeGreaterThan(averageTimeLimits[3]);

    expect(averageTargetPerSecond[0]).toBeLessThan(averageTargetPerSecond[1]);
    expect(averageTargetPerSecond[1]).toBeLessThan(averageTargetPerSecond[2]);
    expect(averageTargetPerSecond[2]).toBeLessThan(averageTargetPerSecond[3]);
  });

  it('stores deterministic metadata and ascending star thresholds', () => {
    const signatures = new Set<string>();

    for (const level of LEVELS) {
      expect(level.moveLimit).toBeGreaterThanOrEqual(15);
      expect(level.moveLimit).toBeLessThanOrEqual(50);
      expect(level.star1).toBeLessThan(level.star2);
      expect(level.star2).toBeLessThan(level.star3);
      expect(level.targetScore).toBeGreaterThanOrEqual(level.star2);
      expect(level.targetScore).toBe(level.star3);
      expect(level.seed).toBeGreaterThan(0);
      expect(level.metadata.code).toBe(`FS-${String(level.id).padStart(3, '0')}`);
      expect(level.metadata.bandIndex).toBeGreaterThan(0);
      expect(level.metadata.targetPerSecond).toBeGreaterThan(0);
      signatures.add(level.metadata.signature);
    }

    expect(signatures.size).toBe(LEVELS.length);
  });

  it('raises star score requirements by 10% for each ten-level block', () => {
    expect(LEVELS.slice(0, 10).every((level) => level.star1 === 2750)).toBe(true);
    expect(LEVELS.slice(0, 10).every((level) => level.star2 === 3550)).toBe(true);
    expect(LEVELS.slice(0, 10).every((level) => level.star3 === 4550)).toBe(true);

    expect(LEVELS.slice(10, 20).every((level) => level.star1 === 3050)).toBe(true);
    expect(LEVELS.slice(10, 20).every((level) => level.star2 === 3900)).toBe(true);
    expect(LEVELS.slice(10, 20).every((level) => level.star3 === 5000)).toBe(true);

    expect(LEVELS.slice(20, 30).every((level) => level.star1 === 3350)).toBe(true);
    expect(LEVELS.slice(20, 30).every((level) => level.star2 === 4300)).toBe(true);
    expect(LEVELS.slice(20, 30).every((level) => level.star3 === 5500)).toBe(true);
  });

  it('uses the expected move curve across the catalog', () => {
    expect(LEVELS.slice(0, 5).every((level) => level.moveLimit === 50)).toBe(true);
    expect(LEVELS[5].moveLimit).toBe(49);
    expect(LEVELS[119].moveLimit).toBeGreaterThanOrEqual(31);

    const moveLimits = LEVELS.map((level) => level.moveLimit);
    const isNonIncreasing = moveLimits.every((moveLimit, index) => index === 0 || moveLimit <= moveLimits[index - 1]);

    expect(isNonIncreasing).toBe(true);
  });

  it('passes the standalone verification script', () => {
    expect(() =>
      execFileSync('node', ['scripts/verify-levels.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
