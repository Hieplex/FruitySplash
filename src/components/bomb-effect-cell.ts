import type { Position } from '@/game/types';

export type BombDropAnimation = {
  key: number;
  target: Position;
  blastCells?: Position[];
};

export type BombEffectFrame = {
  x: number;
  y: number;
  size: number;
};

const BOMB_EXPLOSION_FRAME_SCALE = 0.5;
const BOMB_SHOCKWAVE_FRAME_SCALE = 1.5;
const BOMB_SHOCKWAVE_SCALE_RANGE = [0.05, 0.42, 1, 1] as const;

export function isBombEffectCell(animation: BombDropAnimation | null | undefined, row: number, col: number) {
  return Boolean(animation && Math.abs(row - animation.target.row) <= 1 && Math.abs(col - animation.target.col) <= 1);
}

export function getBombExplosionFrame(frame: BombEffectFrame): BombEffectFrame {
  const size = Math.floor(frame.size * BOMB_EXPLOSION_FRAME_SCALE);
  const inset = Math.round((frame.size - size) / 2);

  return {
    x: frame.x + inset,
    y: frame.y + inset,
    size,
  };
}

export function getBombShockwaveFrame(target: Position, tileSize: number, gap: number): BombEffectFrame {
  const fullSize = tileSize * 3 + gap * 2;
  const size = Math.round(fullSize * BOMB_SHOCKWAVE_FRAME_SCALE);

  return {
    size,
    x: target.col * (tileSize + gap) + tileSize / 2 - size / 2,
    y: target.row * (tileSize + gap) + tileSize / 2 - size / 2,
  };
}

export function getBombShockwaveScaleRange() {
  return [...BOMB_SHOCKWAVE_SCALE_RANGE];
}
