import type { Position } from '@/game/types';

export type SpecialMergePlan = {
  targetCell: Position;
  sourceCount: number;
  particles: Array<{
    cell: Position;
    deltaRow: number;
    deltaCol: number;
    distance: number;
  }>;
};

export type SpecialWipePlan = {
  axis: 'row' | 'column';
  lineIndex: number;
  startCell: Position;
  endCell: Position;
  originCell: Position;
  originIndex: number;
  cellCount: number;
  backwardCells: Position[];
  forwardCells: Position[];
};

export type FruityCrossVisualDirection = 'top' | 'down' | 'left' | 'right';

export type FruityCrossVisualPlan = {
  origin: Position;
  groupDropExtraPx: number;
  groupScale: number;
  armScale: number;
  armPeakOpacity: number;
  armTravelOpacity: number;
  groupLandAt: number;
  splitStartAt: number;
  splitEndAt: number;
  arms: Array<{
    direction: FruityCrossVisualDirection;
    distance: number;
  }>;
};

export type FruityCrossSplitWindow = {
  startAt: number;
  peakAt: number;
  fadeAt: number;
  endAt: number;
};

export function createSpecialMergePlan({
  sourceCells,
  targetCell,
}: {
  sourceCells: Position[];
  targetCell: Position;
}): SpecialMergePlan {
  return {
    targetCell,
    sourceCount: sourceCells.length,
    particles: sourceCells.map((cell) => {
      const deltaRow = targetCell.row - cell.row;
      const deltaCol = targetCell.col - cell.col;

      return {
        cell,
        deltaRow,
        deltaCol,
        distance: Math.abs(deltaRow) + Math.abs(deltaCol),
      };
    }),
  };
}

export function getSpecialMergeAnimationDurationMs({
  mergeDurationMs,
  mergeTargetDropTotalDurationMs = 0,
}: {
  mergeDurationMs: number;
  mergeTargetDropTotalDurationMs?: number;
}) {
  return Math.max(mergeDurationMs, mergeTargetDropTotalDurationMs);
}

export function createFruityCrossSplitWindow({
  splitStartAt,
  splitEndAt,
}: {
  splitStartAt: number;
  splitEndAt: number;
}): FruityCrossSplitWindow {
  const startAt = Math.max(0, Math.min(0.98, splitStartAt));
  const peakAt = Math.max(startAt + 0.001, Math.min(0.99, startAt + 0.02));
  const fadeAt = Math.max(peakAt + 0.001, Math.min(0.999, Math.max(splitEndAt, peakAt + 0.001)));

  return {
    startAt,
    peakAt,
    fadeAt,
    endAt: 1,
  };
}

export function createSpecialWipePlan({
  origin,
  axis,
  cells,
}: {
  origin: Position;
  axis: 'row' | 'column';
  cells: Position[];
}): SpecialWipePlan {
  const ordered = [...cells].sort((left, right) =>
    axis === 'row' ? left.col - right.col || left.row - right.row : left.row - right.row || left.col - right.col,
  );
  const startCell = ordered[0] ?? { row: 0, col: 0 };
  const endCell = ordered[ordered.length - 1] ?? startCell;
  const clampedOrigin = axis === 'row' ? { row: startCell.row, col: origin.col } : { row: origin.row, col: startCell.col };
  const originIndex = Math.max(
    0,
    ordered.findIndex((cell) => cell.row === clampedOrigin.row && cell.col === clampedOrigin.col),
  );
  const originCell = ordered[originIndex] ?? startCell;

  return {
    axis,
    lineIndex: axis === 'row' ? startCell.row : startCell.col,
    startCell,
    endCell,
    originCell,
    originIndex,
    cellCount: ordered.length,
    backwardCells: ordered.slice(0, originIndex).reverse(),
    forwardCells: ordered.slice(originIndex + 1),
  };
}

export function createFruityCrossVisualPlan({
  origin,
  rowCount,
  columnCount,
}: {
  origin: Position;
  rowCount: number;
  columnCount: number;
}): FruityCrossVisualPlan {
  const lastRow = Math.max(0, rowCount - 1);
  const lastColumn = Math.max(0, columnCount - 1);

  return {
    origin,
    groupDropExtraPx: 120,
    groupScale: 1.8,
    armScale: 0.54,
    armPeakOpacity: 1,
    armTravelOpacity: 1,
    groupLandAt: 0.46,
    splitStartAt: 0.58,
    splitEndAt: 0.94,
    arms: [
      { direction: 'top', distance: Math.max(0, origin.row) },
      { direction: 'down', distance: Math.max(0, lastRow - origin.row) },
      { direction: 'left', distance: Math.max(0, origin.col) },
      { direction: 'right', distance: Math.max(0, lastColumn - origin.col) },
    ],
  };
}
