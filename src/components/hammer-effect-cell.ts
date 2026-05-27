import type { Position } from '@/game/types';

export type HammerAnimation = {
  key: number;
  target: Position;
};

export function isHammerEffectCell(animation: HammerAnimation | null | undefined, row: number, col: number) {
  return Boolean(animation && row === animation.target.row && col === animation.target.col);
}
