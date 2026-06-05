import { describe, expect, it } from 'vitest';
import { buildTreeMapViewModel } from '@/navigation/tree-map-view-model';
import { createDefaultProgress } from '@/state/progress-helpers';

describe('tree map view model', () => {
  it('assigns trunk side, fixed node anchors, and canopy or tease visibility per band', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 3,
      starsByLevel: { 1: 3, 2: 2 },
    };

    const viewModel = buildTreeMapViewModel({ progress, maxLevel: 10 });

    expect(viewModel.currentBandIndex).toBe(0);
    expect(viewModel.bands).toHaveLength(2);
    expect(viewModel.bands[0]).toMatchObject({
      bandIndex: 0,
      trunkSide: 'left',
      canopy: { visible: true, mode: 'closed' },
      tease: { visible: false },
    });
    expect(viewModel.bands[1]).toMatchObject({
      bandIndex: 1,
      trunkSide: 'right',
      canopy: { visible: false, mode: 'closed' },
      tease: { visible: true },
    });
    expect(viewModel.bands[0].nodes).toEqual([
      { levelId: 1, state: 'completed', stars: 3, anchor: { x: 0.42, y: 0.16 } },
      { levelId: 2, state: 'completed', stars: 2, anchor: { x: 0.58, y: 0.31 } },
      { levelId: 3, state: 'current', stars: 0, anchor: { x: 0.44, y: 0.48 } },
      { levelId: 4, state: 'locked', stars: 0, anchor: { x: 0.6, y: 0.66 } },
      { levelId: 5, state: 'locked', stars: 0, anchor: { x: 0.48, y: 0.83 } },
    ]);
  });

  it('opens completed-band canopies while keeping the current band curtain closed', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 8,
      starsByLevel: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1 },
    };

    const viewModel = buildTreeMapViewModel({ progress, maxLevel: 14 });

    expect(viewModel.currentBandIndex).toBe(1);
    expect(viewModel.bands).toHaveLength(3);
    expect(viewModel.bands[0].canopy).toEqual({ visible: true, mode: 'open' });
    expect(viewModel.bands[1].canopy).toEqual({ visible: true, mode: 'closed' });
    expect(viewModel.bands[2].tease.visible).toBe(true);
    expect(viewModel.bands[2].nodes).toEqual([
      { levelId: 11, state: 'locked', stars: 0, anchor: { x: 0.42, y: 0.16 } },
      { levelId: 12, state: 'locked', stars: 0, anchor: { x: 0.58, y: 0.31 } },
      { levelId: 13, state: 'locked', stars: 0, anchor: { x: 0.44, y: 0.48 } },
      { levelId: 14, state: 'locked', stars: 0, anchor: { x: 0.6, y: 0.66 } },
    ]);
  });

  it('falls back to a single safe band when maxLevel is invalid', () => {
    const progress = createDefaultProgress();

    expect(buildTreeMapViewModel({ progress, maxLevel: Number.NaN })).toEqual({
      currentBandIndex: 0,
      bands: [
        {
          bandIndex: 0,
          startLevel: 1,
          endLevel: 1,
          trunkSide: 'left',
          nodes: [{ levelId: 1, state: 'current', stars: 0, anchor: { x: 0.42, y: 0.16 } }],
          canopy: { visible: false, mode: 'closed' },
          tease: { visible: false },
        },
      ],
    });
  });
});
