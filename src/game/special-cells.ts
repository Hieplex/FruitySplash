import { getCellFruit } from './board';
import type { Board, MatchGroup, Position, SpecialCellKind, SpecialMatchTier } from './types';

export function getSpecialCellKindForMatch(match: MatchGroup): {
  kind: SpecialCellKind;
  powerTier: SpecialMatchTier;
  fruit: number;
} | null {
  if (match.tier < 4) {
    return null;
  }
  const powerTier = match.tier as SpecialMatchTier;
  const kind =
    match.tier >= 7
      ? 'color-clear'
      : match.tier >= 5
        ? 'cross-wipe'
        : match.axis === 'row'
          ? 'row-wipe'
          : 'column-wipe';

  return {
    kind,
    powerTier,
    fruit: match.fruit,
  };
}

export function pickSpecialCellPosition(match: MatchGroup, movedCell?: Position): Position {
  if (movedCell && match.cells.some((cell) => cell.row === movedCell.row && cell.col === movedCell.col)) {
    return movedCell;
  }

  return match.cells[Math.floor((match.cells.length - 1) / 2)];
}

export function getSpecialCellClearCells(
  origin: Position,
  kind: SpecialCellKind,
  board: Board,
  targetFruit?: number,
): Position[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  if (kind === 'row-wipe') {
    return Array.from({ length: cols }, (_, col) => ({ row: origin.row, col }));
  }

  if (kind === 'column-wipe') {
    return Array.from({ length: rows }, (_, row) => ({ row, col: origin.col }));
  }

  if (kind === 'cross-wipe') {
    const rowCells = Array.from({ length: cols }, (_, col) => ({ row: origin.row, col }));
    const columnCells = Array.from({ length: rows }, (_, row) => ({ row, col: origin.col }));
    const merged = new Map<string, Position>();

    [...rowCells, ...columnCells].forEach((cell) => {
      merged.set(`${cell.row}:${cell.col}`, cell);
    });

    return [...merged.values()];
  }

  if (targetFruit === undefined) {
    return [origin];
  }

  return board.flatMap((row, rowIndex) =>
    row.flatMap((cell, colIndex) =>
      getCellFruit(cell) === targetFruit ? [{ row: rowIndex, col: colIndex }] : [],
    ),
  );
}
