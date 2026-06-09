import { cloneCell, createFruitCell, getCellFruit } from './cells';
import { findMatches } from './match';
import type { Board, NullableBoard, Position } from './types';

export { cloneCell, createFruitCell, getCellFruit, isSpecialCell } from './cells';

export const DEFAULT_ROWS = 8;
export const DEFAULT_COLS = 6;
export const DEFAULT_FRUIT_TYPES = 5;

type CreateBoardOptions = {
  rows?: number;
  cols?: number;
  fruitTypes?: number;
  seed?: number;
};

function createRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function assertShape(rows: readonly number[][], expectedRows: number, expectedCols: number) {
  if (rows.length !== expectedRows || rows.some((row) => row.length !== expectedCols)) {
    throw new Error(`Board must be ${expectedRows}x${expectedCols}.`);
  }
}

function assertFruitRange(rows: readonly number[][], fruitTypes: number) {
  if (rows.some((row) => row.some((fruit) => !Number.isInteger(fruit) || fruit < 0 || fruit >= fruitTypes))) {
    throw new Error(`Board contains an invalid fruit id for ${fruitTypes} fruit types.`);
  }
}

function generateCandidate(rows: number, cols: number, fruitTypes: number, seed: number): Board {
  const rng = createRng(seed);
  const board: Board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => createFruitCell(0)),
  );

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const blocked = new Set<number>();

      if (col >= 2 && getCellFruit(board[row][col - 1]) === getCellFruit(board[row][col - 2])) {
        blocked.add(getCellFruit(board[row][col - 1]));
      }
      if (row >= 2 && getCellFruit(board[row - 1][col]) === getCellFruit(board[row - 2][col])) {
        blocked.add(getCellFruit(board[row - 1][col]));
      }

      const options = Array.from({ length: fruitTypes }, (_, fruit) => fruit).filter(
        (fruit) => !blocked.has(fruit),
      );
      const pick = Math.floor(rng() * options.length);
      board[row][col] = createFruitCell(options[pick] ?? 0);
    }
  }

  return board;
}

export function createBoard(options: CreateBoardOptions = {}): Board {
  const rows = options.rows ?? DEFAULT_ROWS;
  const cols = options.cols ?? DEFAULT_COLS;
  const fruitTypes = options.fruitTypes ?? DEFAULT_FRUIT_TYPES;
  const seed = options.seed ?? 1;

  if (rows !== DEFAULT_ROWS || cols !== DEFAULT_COLS) {
    throw new Error('Fruity Splash boards must be 8x6.');
  }
  if (fruitTypes !== DEFAULT_FRUIT_TYPES) {
    throw new Error('Fruity Splash uses exactly 5 fruit types.');
  }

  for (let offset = 0; offset < 256; offset += 1) {
    const board = generateCandidate(rows, cols, fruitTypes, seed + offset);
    if (findMatches(board).length === 0 && hasAvailableMoves(board)) {
      return board;
    }
  }

  throw new Error('Unable to generate a playable board.');
}

export function createBoardFromRows(rows: readonly number[][]): Board {
  assertShape(rows, DEFAULT_ROWS, DEFAULT_COLS);
  assertFruitRange(rows, DEFAULT_FRUIT_TYPES);
  return rows.map((row) => row.map(createFruitCell));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map(cloneCell));
}

export function cloneNullableBoard(board: NullableBoard): NullableBoard {
  return board.map((row) => row.map((cell) => (cell === null ? null : cloneCell(cell))));
}

export function isWithinBounds(position: Position, board: Board): boolean {
  return (
    position.row >= 0 &&
    position.row < board.length &&
    position.col >= 0 &&
    position.col < board[0].length
  );
}

export function isAdjacent(left: Position, right: Position): boolean {
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col) === 1;
}

export function swapCells(board: Board, left: Position, right: Position): Board {
  if (!isAdjacent(left, right)) {
    throw new Error('Swap positions must be adjacent.');
  }
  if (!isWithinBounds(left, board) || !isWithinBounds(right, board)) {
    throw new Error('Swap positions must stay on the board.');
  }

  const next = cloneBoard(board);
  [next[left.row][left.col], next[right.row][right.col]] = [
    next[right.row][right.col],
    next[left.row][left.col],
  ];
  return next;
}

export function hasAvailableMoves(board: Board): boolean {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const origin = { row, col };
      const candidates = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ];

      for (const target of candidates) {
        if (!isWithinBounds(target, board)) {
          continue;
        }

        const swapped = swapCells(board, origin, target);
        if (findMatches(swapped).length > 0) {
          return true;
        }
      }
    }
  }

  return false;
}
