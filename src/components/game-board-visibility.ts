import type { Position } from '@/game/types';

export function cellKey(row: number, col: number, colCount: number) {
  return row * colCount + col;
}

export function buildSpecialMergeHiddenCellKeys({
  sourceCells,
  hiddenCells,
  targetCell,
  colCount,
}: {
  sourceCells: Position[];
  hiddenCells?: Position[];
  targetCell: Position;
  colCount: number;
}) {
  return new Set(
    [...sourceCells, ...(hiddenCells ?? []), targetCell].map((cell) => cellKey(cell.row, cell.col, colCount)),
  );
}

export function buildSpecialWipeHiddenCellKeys({
  wipes,
  colCount,
}: {
  wipes: Array<{
    cells: Position[];
    previewOnly?: boolean;
    sourceTool?: string;
  } | null | undefined>;
  colCount: number;
}) {
  const hidden = new Set<number>();

  wipes.forEach((wipe) => {
    if (!wipe || wipe.previewOnly || wipe.sourceTool === 'lightningFruits') {
      return;
    }

    wipe.cells.forEach((cell) => {
      hidden.add(cellKey(cell.row, cell.col, colCount));
    });
  });

  return hidden;
}
