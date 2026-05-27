import type { Board, MatchGroup, Position } from './types';

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
      const fruit = board[row][col];
      let end = col + 1;
      while (end < cols && board[row][end] === fruit) {
        end += 1;
      }
      if (end - col >= 3) {
        matches.push({
          axis: 'row',
          fruit,
          cells: buildCells('row', row, col, end - col),
        });
      }
      col = end;
    }
  }

  for (let col = 0; col < cols; col += 1) {
    let row = 0;
    while (row < rows) {
      const fruit = board[row][col];
      let end = row + 1;
      while (end < rows && board[end][col] === fruit) {
        end += 1;
      }
      if (end - row >= 3) {
        matches.push({
          axis: 'column',
          fruit,
          cells: buildCells('column', col, row, end - row),
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
