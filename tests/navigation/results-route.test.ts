import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '@/state/progress-helpers';
import { getResultsRouteModel } from '@/navigation/results-route';

describe('results route model', () => {
  const levelIds = [1, 2, 3] as const;

  it('sends a won level to the next level only when that level exists and is unlocked', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 2,
    };

    expect(
      getResultsRouteModel({
        levelIdParam: '1',
        won: true,
        progress,
        levelIds,
      }),
    ).toMatchObject({
      displayLevelId: 1,
      primaryLabel: 'Next level',
      primaryRoute: '/level/2',
    });
  });

  it('keeps the primary action on the map when the next level is locked or missing', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 1,
    };

    expect(
      getResultsRouteModel({
        levelIdParam: '1',
        won: true,
        progress,
        levelIds,
      }),
    ).toMatchObject({
      primaryLabel: 'Level map',
      primaryRoute: '/map',
    });

    expect(
      getResultsRouteModel({
        levelIdParam: '3',
        won: true,
        progress: { ...progress, unlockedLevel: 4 },
        levelIds,
      }),
    ).toMatchObject({
      displayLevelId: 3,
      primaryLabel: 'Level map',
      primaryRoute: '/map',
    });
  });

  it('falls back to the map for nonexistent result levels instead of building invalid level routes', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 3,
    };

    expect(
      getResultsRouteModel({
        levelIdParam: '999',
        won: false,
        progress,
        levelIds,
      }),
    ).toMatchObject({
      displayLevelId: 3,
      primaryLabel: 'Level map',
      primaryRoute: '/map',
    });
  });
});
