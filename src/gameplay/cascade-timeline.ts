import type { Board, DropMotion, MatchGroup, Position, ScoreEvent } from '@/game/types';

export type CascadeTimelineClearJob = {
  kind: 'clear';
  key: number;
  chain: number;
  board: Board;
  matches: MatchGroup[];
  cells: Position[];
  cleared: number;
  points: number;
  total: number;
};

export type CascadeTimelineDropJob = {
  kind: 'drop';
  key: number;
  chain: number;
  board: Board;
  settledBoard: Board;
  motions: DropMotion[];
  columns: number[];
  maxDistance: number;
  spawnedCount: number;
};

export type CascadeTimelineJob = CascadeTimelineClearJob | CascadeTimelineDropJob;

function uniqueColumns(motions: DropMotion[]) {
  return [...new Set(motions.map((motion) => motion.to.col))].sort((left, right) => left - right);
}

function maxDropDistance(motions: DropMotion[]) {
  return motions.reduce(
    (current, motion) => Math.max(current, Math.abs(motion.to.row - motion.from.row)),
    0,
  );
}

function getMatchedCells(matches: MatchGroup[]) {
  const unique = new Map<string, Position>();

  for (const match of matches) {
    for (const cell of match.cells) {
      unique.set(`${cell.row}:${cell.col}`, cell);
    }
  }

  return [...unique.values()];
}

export function createCascadeTimeline(baseKey: number, scoreEvents: ScoreEvent[]): CascadeTimelineJob[] {
  return scoreEvents.flatMap((event, index) => {
    const clearKey = baseKey + index * 2;
    const dropKey = clearKey + 1;
    const cells = getMatchedCells(event.matches);

    return [
      {
        kind: 'clear' as const,
        key: clearKey,
        chain: event.chain,
        board: event.board,
        matches: event.matches,
        cells,
        cleared: event.cleared,
        points: event.points,
        total: event.total,
      },
      {
        kind: 'drop' as const,
        key: dropKey,
        chain: event.chain,
        board: event.board,
        settledBoard: event.settledBoard,
        motions: event.dropMotions,
        columns: uniqueColumns(event.dropMotions),
        maxDistance: maxDropDistance(event.dropMotions),
        spawnedCount: event.dropMotions.filter((motion) => motion.spawned).length,
      },
    ];
  });
}
