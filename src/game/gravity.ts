import { cloneBoard } from './board';
import { cloneCell, createFruitCell, getCellFruit } from './cells';
import type { Board, BoardCell, DropMotion, Fruit, NullableBoard, Position, RefillSource } from './types';

type SeededRefillOptions = {
  seed: number;
  fruitTypes: number;
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

export function clearMatchedCells(board: Board, positions: Position[]): NullableBoard {
  const next: NullableBoard = cloneBoard(board);

  for (const position of positions) {
    next[position.row][position.col] = null;
  }

  return next;
}

export function createQueueRefill(queue: Fruit[]): RefillSource {
  const items = [...queue];

  return {
    next() {
      const fruit = items.shift();
      if (fruit === undefined) {
        throw new Error('Refill queue is empty.');
      }
      return fruit;
    },
  };
}

export function createSeededRefill({ seed, fruitTypes }: SeededRefillOptions): RefillSource {
  const rng = createRng(seed);

  return {
    next() {
      return Math.floor(rng() * fruitTypes);
    },
  };
}

export function collapseBoard(
  board: NullableBoard,
  refill: RefillSource,
): { board: Board; spawned: Array<Position & { fruit: Fruit }>; dropMotions: DropMotion[] } {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const next: Board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => createFruitCell(0)),
  );
  const spawned: Array<Position & { fruit: Fruit }> = [];
  const dropMotions: DropMotion[] = [];

  for (let col = 0; col < cols; col += 1) {
    const existing = board
      .map((row, rowIndex) => ({ cell: row[col], row: rowIndex }))
      .filter((entry): entry is { cell: BoardCell; row: number } => entry.cell !== null);
    const missing = rows - existing.length;
    const spawnedCells: BoardCell[] = Array.from({ length: missing }, (_, index) => {
      const row = index;
      const fruit = refill.next({ row, col });
      spawned.push({ row, col, fruit });
      dropMotions.push({
        fruit,
        from: { row: index - missing, col },
        to: { row, col },
        spawned: true,
      });
      return createFruitCell(fruit);
    });
    const column: BoardCell[] = spawnedCells.concat(existing.map(({ cell }) => cloneCell(cell)));

    existing.forEach(({ cell, row }, index) => {
      const targetRow = missing + index;
      if (row !== targetRow) {
        dropMotions.push({
          fruit: getCellFruit(cell),
          from: { row, col },
          to: { row: targetRow, col },
          spawned: false,
        });
      }
    });

    for (let row = 0; row < rows; row += 1) {
      next[row][col] = column[row];
    }
  }

  return { board: next, spawned, dropMotions };
}
