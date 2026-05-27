import { isWithinBounds, swapCells } from './board';
import { findMatches, getMatchedCells } from './match';
import type { Board, Position } from './types';

export type RecommendedMove = {
  from: Position;
  to: Position;
  matchedCells: Position[];
  hintCells: Position[];
};

function samePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col;
}

function mapMatchedCellsToCurrentBoard(cells: Position[], from: Position, to: Position) {
  return cells.map((cell) => {
    if (samePosition(cell, from)) {
      return to;
    }
    if (samePosition(cell, to)) {
      return from;
    }
    return cell;
  });
}

export function findRecommendedMove(board: Board): RecommendedMove | null {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const from = { row, col };
      const candidates = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ];

      for (const to of candidates) {
        if (!isWithinBounds(to, board)) {
          continue;
        }

        const swapped = swapCells(board, from, to);
        const matches = findMatches(swapped);
        if (matches.length > 0) {
          const matchedCells = getMatchedCells(matches);
          return {
            from,
            to,
            matchedCells,
            hintCells: mapMatchedCellsToCurrentBoard(matchedCells, from, to),
          };
        }
      }
    }
  }

  return null;
}
