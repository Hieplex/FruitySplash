import { describe, expect, it } from 'vitest';

import { createMatchSplashParticlePlan } from '@/components/match-splash-plan';

describe('match splash particle plan', () => {
  it('creates a deterministic bloom and sparkle clear plan for each matched fruit cell', () => {
    const plan = createMatchSplashParticlePlan({
      key: 12,
      row: 2,
      col: 3,
      fruit: 4,
    });

    expect(plan.assetId).toBe('blueberry');
    expect(plan.sparkles).toHaveLength(5);
    expect(plan.mysteryCloud.opacity).toBeGreaterThan(0.25);
    expect(plan.mysteryCloud.scale).toBeGreaterThanOrEqual(1.08);
    expect(plan.mysteryCloud.scale).toBeLessThanOrEqual(1.18);
    expect(plan.mysteryCloud.tintColor).toBe('#6a5cff');
    expect(plan.coreFlash.scale).toBeGreaterThan(1);
    expect(plan.coreFlash.opacity).toBeGreaterThanOrEqual(0.95);
    expect(plan.coreFlash.scale).toBeLessThanOrEqual(1.1);
    expect(Math.min(...plan.sparkles.map((sparkle) => sparkle.opacity))).toBeGreaterThanOrEqual(0.9);
    expect('fruitGlow' in plan).toBe(false);
    expect('bloomRings' in plan).toBe(false);
    expect('seedBursts' in plan).toBe(false);
    expect('droplets' in plan).toBe(false);

    expect(createMatchSplashParticlePlan({ key: 12, row: 2, col: 3, fruit: 4 })).toEqual(plan);
    expect(createMatchSplashParticlePlan({ key: 12, row: 2, col: 4, fruit: 4 })).not.toEqual(plan);
    expect(createMatchSplashParticlePlan({ key: 12, row: 2, col: 3, fruit: 1 }).mysteryCloud.tintColor).toBe(
      '#ff4a4a',
    );
  });

  it('can cap sparkle particles for larger matched groups', () => {
    expect(createMatchSplashParticlePlan({ key: 12, row: 2, col: 3, fruit: 4, sparkleLimit: 4 }).sparkles).toHaveLength(4);
    expect(createMatchSplashParticlePlan({ key: 12, row: 2, col: 3, fruit: 4, sparkleLimit: 3 }).sparkles).toHaveLength(3);
  });
});
