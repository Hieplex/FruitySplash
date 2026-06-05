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
  currentLevelId: number | null;
  teaseVisible: boolean;
  levels: TreeBandLevel[];
};

function sanitizeLevelId(levelId: number) {
  return Number.isFinite(levelId) ? Math.max(1, Math.floor(levelId)) : 1;
}

function sanitizeBandIndex(bandIndex: number) {
  return Number.isFinite(bandIndex) ? Math.max(0, Math.floor(bandIndex)) : 0;
}

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
  return Math.floor((sanitizeLevelId(levelId) - 1) / TREE_LEVELS_PER_BAND);
}

export function getTreeBandLevelRange(bandIndex: number) {
  const safeBandIndex = sanitizeBandIndex(bandIndex);
  const startLevel = safeBandIndex * TREE_LEVELS_PER_BAND + 1;

  return {
    startLevel,
    endLevel: startLevel + TREE_LEVELS_PER_BAND - 1,
  };
}

export function buildTreeBands(progress: ProgressState, maxLevel: number): TreeBand[] {
  const safeMaxLevel = sanitizeLevelId(maxLevel);
  const bandCount = Math.max(1, Math.ceil(safeMaxLevel / TREE_LEVELS_PER_BAND));
  const currentBandIndex = getTreeBandIndexForLevel(progress.unlockedLevel);

  return Array.from({ length: bandCount }, (_, bandIndex) => {
    const { startLevel, endLevel } = getTreeBandLevelRange(bandIndex);
    const clampedEndLevel = Math.min(endLevel, safeMaxLevel);
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
      currentLevelId: levels.find((level) => level.state === 'current')?.levelId ?? null,
      teaseVisible: bandIndex === currentBandIndex + 1,
      levels,
    };
  });
}
