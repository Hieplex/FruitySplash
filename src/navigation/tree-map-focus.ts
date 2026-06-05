import { TREE_LEVELS_PER_BAND } from '@/navigation/tree-map-model';

type BandScrollOffsetInput = {
  bandIndex: number;
  bandHeight: number;
  focusInset: number;
};

type BandRevealPlanInput = {
  currentLevelId: number;
  unlockedLevel: number;
};

export type BandRevealPlan = {
  revealBandStartLevel: number;
  focusLevel: number;
};

export function getBandScrollOffset({ bandIndex, bandHeight, focusInset }: BandScrollOffsetInput) {
  return Math.max(0, bandIndex * bandHeight - focusInset);
}

export function getBandRevealPlan({
  currentLevelId,
  unlockedLevel,
}: BandRevealPlanInput): BandRevealPlan | null {
  const finishedBand = currentLevelId % TREE_LEVELS_PER_BAND === 0;
  const unlockedNextLevel = unlockedLevel === currentLevelId + 1;

  if (!finishedBand || !unlockedNextLevel) {
    return null;
  }

  return {
    revealBandStartLevel: unlockedLevel,
    focusLevel: unlockedLevel,
  };
}
