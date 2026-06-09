import type { BoardCell, Fruit, NormalCell, SpecialCell } from './types';

export function createFruitCell(fruit: Fruit): NormalCell {
  return { type: 'fruit', fruit };
}

export function getCellFruit(cell: BoardCell): Fruit {
  return cell.fruit;
}

export function isSpecialCell(cell: BoardCell): cell is SpecialCell {
  return cell.type === 'special';
}

export function cloneCell(cell: BoardCell): BoardCell {
  return { ...cell };
}
