import type { Position } from '@/game/types';

export type BombDropAnimation = {
  key: number;
  target: Position;
  blastCells?: Position[];
};

export function isBombEffectCell(animation: BombDropAnimation | null | undefined, row: number, col: number) {
  return Boolean(animation && Math.abs(row - animation.target.row) <= 1 && Math.abs(col - animation.target.col) <= 1);
}
