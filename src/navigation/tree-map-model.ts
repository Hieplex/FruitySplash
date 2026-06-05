import type { ProgressState } from '@/state/progress-helpers';

export const TREE_LEVELS_PER_BAND = 5;

export type TreeNodeState = 'completed' | 'current' | 'locked';

export type TreeBandLevel = {
  levelId: number;
  state: TreeNodeState;
};

export type TreeBand = {
  bandIndex: number;
  startLevel: number;
  endLevel: number;
  teaseVisible: boolean;
  levels: TreeBandLevel[];
};

function getTreeNodeState(progress: ProgressState, levelId: number): TreeNodeState {
  if (levelId < progress.unlockedLevel) {
    return 'completed';
  }

  if (levelId === progress.unlockedLevel) {
    return 'current';
  }

  return 'locked';
}

export function getTreeBandIndexForLevel(levelId: number) {
  return Math.max(0, Math.floor((Math.max(1, levelId) - 1) / TREE_LEVELS_PER_BAND));
}

export function getTreeBandLevelRange(bandIndex: number) {
  const safeBandIndex = Math.max(0, bandIndex);
  const startLevel = safeBandIndex * TREE_LEVELS_PER_BAND + 1;

  return {
    startLevel,
    endLevel: startLevel + TREE_LEVELS_PER_BAND - 1,
  };
}

export function buildTreeBands(progress: ProgressState, maxLevel: number): TreeBand[] {
  const bandCount = Math.max(1, Math.ceil(maxLevel / TREE_LEVELS_PER_BAND));
  const currentBandIndex = getTreeBandIndexForLevel(progress.unlockedLevel);

  return Array.from({ length: bandCount }, (_, bandIndex) => {
    const { startLevel, endLevel } = getTreeBandLevelRange(bandIndex);
    const clampedEndLevel = Math.min(endLevel, maxLevel);
    const levels = Array.from({ length: clampedEndLevel - startLevel + 1 }, (_, offset) => {
      const levelId = startLevel + offset;

      return {
        levelId,
        state: getTreeNodeState(progress, levelId),
      };
    });

    return {
      bandIndex,
      startLevel,
      endLevel: clampedEndLevel,
      teaseVisible: bandIndex === currentBandIndex + 1,
      levels,
    };
  });
}
