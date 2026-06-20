import type { SpecialCellKind, SpecialWipeSourceTool } from '@/game/types';

export type GameBoardLayerDepth = {
  zIndex: number;
  elevation: number;
};

export const SPECIAL_MERGE_LAYER_DEPTH: GameBoardLayerDepth = {
  zIndex: 16,
  elevation: 16,
};

export const SPECIAL_WIPE_LAYER_DEPTH: GameBoardLayerDepth = {
  zIndex: 17,
  elevation: 17,
};

export const MATCH_SPLASH_LAYER_DEPTH: GameBoardLayerDepth = {
  zIndex: 20,
  elevation: 20,
};

export const LINE_ROCKET_WIPE_LAYER_DEPTH: GameBoardLayerDepth = {
  zIndex: 22,
  elevation: 22,
};

export const FRUITY_CROSS_WIPE_LAYER_DEPTH: GameBoardLayerDepth = {
  zIndex: 21,
  elevation: 21,
};

export const LIGHTNING_FRUITS_WIPE_LAYER_DEPTH: GameBoardLayerDepth = {
  zIndex: 23,
  elevation: 23,
};

export function getSpecialWipeLayerDepth({
  kind,
  sourceTool,
}: {
  kind: SpecialCellKind;
  sourceTool?: SpecialWipeSourceTool;
}): GameBoardLayerDepth {
  if (kind === 'row-wipe' && sourceTool === 'lineRocket') {
    return LINE_ROCKET_WIPE_LAYER_DEPTH;
  }
  if (kind === 'cross-wipe' && sourceTool === 'fruityCross') {
    return FRUITY_CROSS_WIPE_LAYER_DEPTH;
  }
  if (kind === 'color-clear' && sourceTool === 'lightningFruits') {
    return LIGHTNING_FRUITS_WIPE_LAYER_DEPTH;
  }

  return SPECIAL_WIPE_LAYER_DEPTH;
}
