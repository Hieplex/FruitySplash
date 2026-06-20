import { isSpecialCell } from './board';
import { getSpecialCellClearCells } from './special-cells';
import type { Board, Position, SpecialCell } from './types';

export const SPECIAL_CHAIN_WAVE_STEP_MS = 90;

export type SpecialChainActivation = {
  position: Position;
  special: SpecialCell;
  cells: Position[];
  triggeredBy?: Position;
  triggerDelayMs: number;
  targetFruit?: number;
};

export type SpecialChainSeed = {
  position: Position;
  triggeredBy?: Position;
  triggerDelayMs?: number;
  targetFruit?: number;
};

export function positionKey(position: Position) {
  return `${position.row}:${position.col}`;
}

export function getSpecialChainDelayMs(origin: Position, target: Position) {
  return (Math.abs(target.row - origin.row) + Math.abs(target.col - origin.col)) * SPECIAL_CHAIN_WAVE_STEP_MS;
}

export function uniquePositions(cells: Position[]) {
  const unique = new Map<string, Position>();

  cells.forEach((cell) => {
    unique.set(positionKey(cell), cell);
  });

  return [...unique.values()];
}

export function collectSpecialChainActivations(board: Board, seeds: SpecialChainSeed[]) {
  const activations: SpecialChainActivation[] = [];
  const activated = new Set<string>();
  const queue = seeds.map((seed) => ({
    ...seed,
    triggerDelayMs: seed.triggerDelayMs ?? 0,
  }));

  for (let index = 0; index < queue.length; index += 1) {
    const { position, triggeredBy, triggerDelayMs, targetFruit: seedTargetFruit } = queue[index];
    const key = positionKey(position);
    if (activated.has(key)) {
      continue;
    }
    const cell = board[position.row]?.[position.col];
    if (!cell || !isSpecialCell(cell)) {
      continue;
    }
    activated.add(key);

    const targetFruit = cell.kind === 'color-clear' ? (seedTargetFruit ?? cell.fruit) : undefined;
    const clearCells = uniquePositions([
      position,
      ...getSpecialCellClearCells(position, cell.kind, board, targetFruit),
    ]);
    activations.push({
      position,
      special: cell,
      cells: clearCells,
      triggeredBy,
      triggerDelayMs,
      targetFruit,
    });
    for (const clearCell of clearCells) {
      const clearCellKey = positionKey(clearCell);
      if (clearCellKey === key || activated.has(clearCellKey)) {
        continue;
      }
      const hitCell = board[clearCell.row]?.[clearCell.col];
      if (!hitCell || !isSpecialCell(hitCell)) {
        continue;
      }
      queue.push({
        position: clearCell,
        triggeredBy: position,
        triggerDelayMs: triggerDelayMs + getSpecialChainDelayMs(position, clearCell),
      });
    }
  }

  return activations.sort((left, right) => left.triggerDelayMs - right.triggerDelayMs);
}
