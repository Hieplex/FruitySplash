import { buildTreeBands, getTreeBandIndexForLevel, type TreeNodeState } from '@/navigation/tree-map-model';
import type { ProgressState } from '@/state/progress-helpers';

const BASE_NODE_ANCHORS = [
  { x: 0.42, y: 0.16 },
  { x: 0.58, y: 0.31 },
  { x: 0.44, y: 0.48 },
  { x: 0.6, y: 0.66 },
  { x: 0.48, y: 0.83 },
] as const;

export type TreeMapTrunkSide = 'left' | 'right';
export type TreeMapCanopyMode = 'open' | 'closed';

export type TreeMapNodeAnchor = {
  x: number;
  y: number;
};

export type TreeMapNodeViewModel = {
  levelId: number;
  state: TreeNodeState;
  stars: number;
  anchor: TreeMapNodeAnchor;
};

export type TreeMapBandViewModel = {
  bandIndex: number;
  startLevel: number;
  endLevel: number;
  trunkSide: TreeMapTrunkSide;
  nodes: TreeMapNodeViewModel[];
  canopy: {
    visible: boolean;
    mode: TreeMapCanopyMode;
  };
  tease: {
    visible: boolean;
  };
};

export type TreeMapViewModel = {
  currentBandIndex: number;
  bands: TreeMapBandViewModel[];
};

function getNodeAnchor(index: number): TreeMapNodeAnchor {
  const fallbackAnchor = BASE_NODE_ANCHORS[BASE_NODE_ANCHORS.length - 1];
  const anchor = BASE_NODE_ANCHORS[index] ?? fallbackAnchor;

  return { x: anchor.x, y: anchor.y };
}

export function buildTreeMapViewModel({
  progress,
  maxLevel,
}: {
  progress: ProgressState;
  maxLevel: number;
}): TreeMapViewModel {
  const bands = buildTreeBands(progress, maxLevel);
  const lastBandIndex = bands.length - 1;
  const currentBandIndex = Math.min(getTreeBandIndexForLevel(progress.unlockedLevel), lastBandIndex);

  return {
    currentBandIndex,
    bands: bands.map((band) => ({
      bandIndex: band.bandIndex,
      startLevel: band.startLevel,
      endLevel: band.endLevel,
      trunkSide: band.bandIndex % 2 === 0 ? 'left' : 'right',
      nodes: band.levels.map((level, index) => ({
        levelId: level.levelId,
        state: level.state,
        stars: progress.starsByLevel[level.levelId] ?? 0,
        anchor: getNodeAnchor(index),
      })),
      canopy: {
        visible: band.bandIndex < lastBandIndex,
        mode: band.bandIndex < currentBandIndex ? 'open' : 'closed',
      },
      tease: {
        visible: band.teaseVisible,
      },
    })),
  };
}
