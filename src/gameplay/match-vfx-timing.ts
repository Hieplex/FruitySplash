import type { Position } from '@/game/types';

export const SPECIAL_WIPE_WAVE_STEP_MS = 90;
export const SPECIAL_WIPE_PRE_SHRINK_MS = 60;
export const SPECIAL_WIPE_SPLASH_DURATION_MS = 200;
export const LINE_ROCKET_CLEAR_LEAD_MS = 240;
export const LIGHTNING_FRUITS_CONTACT_RATIO = 0.42;
export const FRUITY_CROSS_GROUP_DROP_MS = 344;
export const FRUITY_CROSS_SPLIT_LAUNCH_MS = 60;
export const BOMB_DROP_DURATION_MS = 360;
export const BOMB_IMPACT_DURATION_MS = 460;
export const BOMB_SHOCKWAVE_DURATION_MS = 420;
export const BOMB_POP_DURATION_MS = 280;
export const BOMB_CLEAR_DROP_START_DELAY_MS =
  BOMB_DROP_DURATION_MS + BOMB_IMPACT_DURATION_MS + Math.max(BOMB_SHOCKWAVE_DURATION_MS, BOMB_POP_DURATION_MS);

export function getSpecialWipeDelayMs(cell: Position, origin: Position) {
  return (Math.abs(cell.row - origin.row) + Math.abs(cell.col - origin.col)) * SPECIAL_WIPE_WAVE_STEP_MS;
}

export function getSpecialWipeMaxDelayMs(cells: Position[], origin?: Position) {
  if (!origin || cells.length === 0) {
    return 0;
  }

  return cells.reduce((maxDelay, cell) => Math.max(maxDelay, getSpecialWipeDelayMs(cell, origin)), 0);
}

export function getLineRocketTravelEndMs(maxCellDelayMs: number, _preShrinkMs: number) {
  return Math.max(0, maxCellDelayMs);
}

export function getLineRocketFadeStartMs(maxCellDelayMs: number, preShrinkMs: number) {
  return getLineRocketTravelEndMs(maxCellDelayMs, preShrinkMs) + Math.max(0, preShrinkMs);
}

export function getLineRocketClearDelayMs(cellTravelDelayMs: number, preShrinkMs: number) {
  return Math.max(0, cellTravelDelayMs - Math.max(LINE_ROCKET_CLEAR_LEAD_MS, preShrinkMs));
}

export function getFruityCrossSplitStartMs() {
  return FRUITY_CROSS_GROUP_DROP_MS + FRUITY_CROSS_SPLIT_LAUNCH_MS;
}

export function getFruityCrossClearDelayMs(cellWaveDelayMs: number) {
  return getFruityCrossSplitStartMs() + Math.max(0, cellWaveDelayMs);
}

export function getFruityCrossTravelEndMs(maxCellWaveDelayMs: number) {
  return getFruityCrossSplitStartMs() + Math.max(0, maxCellWaveDelayMs);
}

export function getLightningFruitsChainDelayMs(maxCellDelayMs: number, preShrinkMs: number) {
  const contactMs =
    (Math.max(0, maxCellDelayMs) + Math.max(0, preShrinkMs) + SPECIAL_WIPE_SPLASH_DURATION_MS) *
    LIGHTNING_FRUITS_CONTACT_RATIO;

  return Math.max(0, Math.round(contactMs) - Math.max(0, preShrinkMs));
}

export function getMatchSoundDelayMs(splash?: { preShrinkMs?: number } | null) {
  return Math.max(0, splash?.preShrinkMs ?? 0);
}
