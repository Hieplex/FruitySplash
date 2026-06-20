import type { SpecialCellKind } from '@/game/types';
import type { Position } from '@/game/types';

export const DIRECT_SPECIAL_POWER_TOOL_IDS = ['lineRocket', 'fruityCross', 'lightningFruits'] as const;
export const LINE_ROCKET_WAVE_STEP_MS = 140;

export type DirectSpecialPowerTool = (typeof DIRECT_SPECIAL_POWER_TOOL_IDS)[number];
export type LineRocketTravelDirection = 'left-to-right' | 'right-to-left';

export type DirectSpecialPowerKind = Extract<SpecialCellKind, 'row-wipe' | 'cross-wipe' | 'color-clear'>;

export const DIRECT_SPECIAL_POWER_TO_KIND: Record<DirectSpecialPowerTool, DirectSpecialPowerKind> = {
  lineRocket: 'row-wipe',
  fruityCross: 'cross-wipe',
  lightningFruits: 'color-clear',
};

export function getDirectSpecialPowerKind(tool: DirectSpecialPowerTool) {
  return DIRECT_SPECIAL_POWER_TO_KIND[tool];
}

export function getLineRocketTravelDirection(target: Position, columnCount: number): LineRocketTravelDirection {
  const lastColumn = Math.max(0, columnCount - 1);
  const leftDistance = Math.max(0, target.col);
  const rightDistance = Math.max(0, lastColumn - target.col);

  return leftDistance <= rightDistance ? 'left-to-right' : 'right-to-left';
}

export function getLineRocketCellDelayMs(
  cell: Position,
  columnCount: number,
  direction: LineRocketTravelDirection,
) {
  const lastColumn = Math.max(0, columnCount - 1);
  const travelIndex = direction === 'left-to-right' ? cell.col : lastColumn - cell.col;

  return Math.max(0, travelIndex) * LINE_ROCKET_WAVE_STEP_MS;
}
