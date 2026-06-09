import { getCellFruit } from './cells';
import type { Board, MatchGroup, MatchTier, Position } from './types';

const MATCH_TIER_BONUS: Record<MatchTier, number> = {
  3: 0,
  4: 20,
  5: 50,
  6: 90,
  7: 140,
};

export function getMatchTier(size: number): MatchTier {
  if (size >= 7) return 7;
  if (size >= 6) return 6;
  if (size >= 5) return 5;
  if (size >= 4) return 4;
  return 3;
}

export function getMatchGroupScore(match: MatchGroup) {
  const size = match.size ?? match.cells.length;
  const tier = match.tier ?? getMatchTier(size);

  return size * 10 + MATCH_TIER_BONUS[tier];
}

export function getMatchScore(matches: MatchGroup[]) {
  return matches.reduce((total, match) => total + getMatchGroupScore(match), 0);
}

function buildCells(
  axis: MatchGroup['axis'],
  fixed: number,
  start: number,
  length: number,
): Position[] {
  return Array.from({ length }, (_, offset) =>
    axis === 'row'
      ? { row: fixed, col: start + offset }
      : { row: start + offset, col: fixed },
  );
}

export function findMatches(board: Board): MatchGroup[] {
  const matches: MatchGroup[] = [];
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  for (let row = 0; row < rows; row += 1) {
    let col = 0;
    while (col < cols) {
      const fruit = getCellFruit(board[row][col]);
      let end = col + 1;
      while (end < cols && getCellFruit(board[row][end]) === fruit) {
        end += 1;
      }
      if (end - col >= 3) {
        const size = end - col;
        matches.push({
          axis: 'row',
          fruit,
          size,
          tier: getMatchTier(size),
          cells: buildCells('row', row, col, size),
        });
      }
      col = end;
    }
  }

  for (let col = 0; col < cols; col += 1) {
    let row = 0;
    while (row < rows) {
      const fruit = getCellFruit(board[row][col]);
      let end = row + 1;
      while (end < rows && getCellFruit(board[end][col]) === fruit) {
        end += 1;
      }
      if (end - row >= 3) {
        const size = end - row;
        matches.push({
          axis: 'column',
          fruit,
          size,
          tier: getMatchTier(size),
          cells: buildCells('column', col, row, size),
        });
      }
      row = end;
    }
  }

  return matches;
}

export function getMatchedCells(matches: MatchGroup[]): Position[] {
  const unique = new Map<string, Position>();

  for (const match of matches) {
    for (const cell of match.cells) {
      unique.set(`${cell.row}:${cell.col}`, cell);
    }
  }

  return [...unique.values()].sort((left, right) =>
    left.row === right.row ? left.col - right.col : left.row - right.row,
  );
}
