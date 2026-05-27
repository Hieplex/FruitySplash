import { isWithinBounds } from '@/game/board';
import type { Board, Position } from '@/game/types';

export function getBombBlastCells(center: Position, board: Board): Position[] {
  const cells: Position[] = [];

  for (let row = center.row - 1; row <= center.row + 1; row += 1) {
    for (let col = center.col - 1; col <= center.col + 1; col += 1) {
      const position = { row, col };
      if (isWithinBounds(position, board)) {
        cells.push(position);
      }
    }
  }

  return cells;
}
