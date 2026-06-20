import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MATCH_SPLASH_LAYER_DEPTH,
  getSpecialWipeLayerDepth,
} from '@/components/game-board-layer-depths';
import {
  createFruityCrossSplitWindow,
  createFruityCrossVisualPlan,
  createSpecialMergePlan,
  getSpecialMergeAnimationDurationMs,
  createSpecialWipePlan,
} from '@/components/special-cell-layer-plan';

function expectMonotonic(values: number[]) {
  values.forEach((value, index) => {
    if (index > 0) {
      expect(value).toBeGreaterThanOrEqual(values[index - 1]);
    }
  });
}

describe('special cell layer plans', () => {
  it('does not render extra directed wipe line or ring overlays for special clears', () => {
    const layerSource = readFileSync(join(process.cwd(), 'src/components/special-cell-layer.tsx'), 'utf8');

    expect(layerSource).not.toContain('renderOriginDirectedWipeSegments');
    expect(layerSource).not.toContain('-segment-');
    expect(layerSource).not.toContain('borderWidth: Math.max(2, Math.round(tileSize * 0.06))');
  });

  it('renders normal special wipe fruit clears separately from booster animations', () => {
    const layerSource = readFileSync(join(process.cwd(), 'src/components/special-cell-layer.tsx'), 'utf8');

    expect(layerSource).toContain('const renderNormalSpecialWipeCellClears = () =>');
    expect(layerSource).toContain('!isFruityCrossWipe && !isLineRocketWipe && !isLightningFruitsWipe');
    expect(layerSource).toContain('{renderNormalSpecialWipeCellClears()}');
  });

  it('creates a merge plan that preserves the target cell and source count', () => {
    expect(
      createSpecialMergePlan({
        sourceCells: [
          { row: 2, col: 1 },
          { row: 2, col: 2 },
        ],
        targetCell: { row: 2, col: 3 },
      }),
    ).toMatchObject({
      targetCell: { row: 2, col: 3 },
      sourceCount: 2,
    });
  });

  it('keeps special merge animation alive for a carried target drop', () => {
    expect(
      getSpecialMergeAnimationDurationMs({
        mergeDurationMs: 420,
        mergeTargetDropTotalDurationMs: 760,
      }),
    ).toBe(760);

    expect(
      getSpecialMergeAnimationDurationMs({
        mergeDurationMs: 420,
        mergeTargetDropTotalDurationMs: 0,
      }),
    ).toBe(420);
  });

  it('creates a row wipe plan with horizontal sweep bounds', () => {
    expect(
      createSpecialWipePlan({
        origin: { row: 4, col: 2 },
        axis: 'row',
        cells: [
          { row: 4, col: 0 },
          { row: 4, col: 1 },
          { row: 4, col: 2 },
          { row: 4, col: 3 },
          { row: 4, col: 4 },
          { row: 4, col: 5 },
        ],
      }),
    ).toMatchObject({
      axis: 'row',
      lineIndex: 4,
      startCell: { row: 4, col: 0 },
      endCell: { row: 4, col: 5 },
      originCell: { row: 4, col: 2 },
      originIndex: 2,
      cellCount: 6,
      backwardCells: [
        { row: 4, col: 1 },
        { row: 4, col: 0 },
      ],
      forwardCells: [
        { row: 4, col: 3 },
        { row: 4, col: 4 },
        { row: 4, col: 5 },
      ],
    });
  });

  it('creates a column wipe plan with vertical sweep bounds', () => {
    expect(
      createSpecialWipePlan({
        origin: { row: 3, col: 1 },
        axis: 'column',
        cells: [
          { row: 0, col: 1 },
          { row: 1, col: 1 },
          { row: 2, col: 1 },
          { row: 3, col: 1 },
          { row: 4, col: 1 },
          { row: 5, col: 1 },
          { row: 6, col: 1 },
          { row: 7, col: 1 },
        ],
      }),
    ).toMatchObject({
      axis: 'column',
      lineIndex: 1,
      startCell: { row: 0, col: 1 },
      endCell: { row: 7, col: 1 },
      originCell: { row: 3, col: 1 },
      originIndex: 3,
      cellCount: 8,
      backwardCells: [
        { row: 2, col: 1 },
        { row: 1, col: 1 },
        { row: 0, col: 1 },
      ],
      forwardCells: [
        { row: 4, col: 1 },
        { row: 5, col: 1 },
        { row: 6, col: 1 },
        { row: 7, col: 1 },
      ],
    });
  });

  it('puts the LineRocket wipe above the match splash fruit clone layer', () => {
    expect(
      getSpecialWipeLayerDepth({
        kind: 'row-wipe',
        sourceTool: 'lineRocket',
      }).zIndex,
    ).toBeGreaterThan(MATCH_SPLASH_LAYER_DEPTH.zIndex);

    expect(
      getSpecialWipeLayerDepth({
        kind: 'row-wipe',
      }).zIndex,
    ).toBeLessThan(MATCH_SPLASH_LAYER_DEPTH.zIndex);
  });

  it('puts the direct FruityCross wipe above the match splash fruit clone layer', () => {
    expect(
      getSpecialWipeLayerDepth({
        kind: 'cross-wipe',
        sourceTool: 'fruityCross',
      }).zIndex,
    ).toBeGreaterThan(MATCH_SPLASH_LAYER_DEPTH.zIndex);

    expect(
      getSpecialWipeLayerDepth({
        kind: 'cross-wipe',
      }).zIndex,
    ).toBeLessThan(MATCH_SPLASH_LAYER_DEPTH.zIndex);
  });

  it('creates four FruityCross visual arms from the origin to the board edges', () => {
    expect(
      createFruityCrossVisualPlan({
        origin: { row: 3, col: 2 },
        rowCount: 8,
        columnCount: 6,
      }),
    ).toEqual({
      origin: { row: 3, col: 2 },
      groupDropExtraPx: 120,
      groupScale: 1.8,
      armScale: 0.54,
      armPeakOpacity: 1,
      armTravelOpacity: 1,
      groupLandAt: 0.46,
      splitStartAt: 0.58,
      splitEndAt: 0.94,
      arms: [
        { direction: 'top', distance: 3 },
        { direction: 'down', distance: 4 },
        { direction: 'left', distance: 2 },
        { direction: 'right', distance: 3 },
      ],
    });
  });

  it('keeps the FruityCross split animation ranges monotonic during a long edit hold', () => {
    const splitWindow = createFruityCrossSplitWindow({
      splitStartAt: 0.9438914027149321,
      splitEndAt: 0.995,
    });

    expectMonotonic([
      0,
      splitWindow.startAt,
      splitWindow.peakAt,
      splitWindow.fadeAt,
      splitWindow.endAt,
    ]);
    expect(splitWindow.startAt).toBeCloseTo(0.9438914027149321);
    expect(splitWindow.endAt).toBe(1);
  });
});
