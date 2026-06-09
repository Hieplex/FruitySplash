import { cloneBoard, cloneNullableBoard, hasAvailableMoves, isAdjacent, isSpecialCell, swapCells } from './board';
import { clearMatchedCells, collapseBoard } from './gravity';
import { findMatches, getMatchedCells, getMatchScore, getMatchTier } from './match';
import {
  getSpecialCellClearCells,
  getSpecialCellKindForMatch,
  pickSpecialCellPosition,
} from './special-cells';
import type {
  Board,
  CascadeTimelineCause,
  CascadeTimelineEvent,
  EngineState,
  RefillSource,
  ScoreEvent,
  Position,
  MatchGroup,
  MatchTier,
  SpecialCell,
  Swap,
  TimerState,
} from './types';

export type ReshuffleEvent = {
  before: Board;
  after: Board;
};

type ResolveSwapOptions = {
  refill: RefillSource;
  onScore?: (event: ScoreEvent) => void;
  onTimelineEvent?: (event: CascadeTimelineEvent) => void;
  onDeadBoard?: (board: Board) => void;
  onReshuffle?: (payload: ReshuffleEvent) => void;
  reshuffle?: (board: Board) => Board;
  cause?: CascadeTimelineCause;
  movedCell?: Position;
  timelineKeyStart?: number;
};

type ResolveBoardMatchesOptions = ResolveSwapOptions;

type EnsurePlayableOptions = {
  onDeadBoard?: (board: Board) => void;
  onReshuffle?: (payload: ReshuffleEvent) => void;
  reshuffle?: (board: Board) => Board;
};

function isSamePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col;
}

function uniquePositions(cells: Position[]) {
  const unique = new Map<string, Position>();

  cells.forEach((cell) => {
    unique.set(`${cell.row}:${cell.col}`, cell);
  });

  return [...unique.values()];
}

type SpecialCreation = {
  cluster: MatchCluster;
  position: Position;
  special: SpecialCell;
};

type MatchCluster = {
  primaryGroup: MatchGroup;
  groups: MatchGroup[];
  fruit: number;
  cells: Position[];
  size: number;
  tier: MatchTier;
};

function getVisualClearMatches(
  clusters: MatchCluster[],
  specialCreation: SpecialCreation | null,
) {
  if (!specialCreation) {
    return clusters.map(toEffectiveMatch);
  }

  return clusters
    .filter((cluster) => cluster !== specialCreation.cluster)
    .map(toEffectiveMatch);
}

function shareCell(left: MatchGroup, right: MatchGroup) {
  const cells = new Set(left.cells.map((cell) => `${cell.row}:${cell.col}`));

  return right.cells.some((cell) => cells.has(`${cell.row}:${cell.col}`));
}

function toEffectiveMatch(cluster: MatchCluster): MatchGroup {
  return {
    axis: cluster.primaryGroup.axis,
    fruit: cluster.fruit,
    size: cluster.size,
    tier: cluster.tier,
    cells: cluster.cells,
  };
}

function buildMatchClusters(matches: MatchGroup[]) {
  const clusters: MatchCluster[] = [];
  const visited = new Set<number>();

  for (let index = 0; index < matches.length; index += 1) {
    if (visited.has(index)) {
      continue;
    }

    const queue = [index];
    const groupIndexes: number[] = [];

    while (queue.length > 0) {
      const currentIndex = queue.shift();
      if (currentIndex === undefined || visited.has(currentIndex)) {
        continue;
      }

      visited.add(currentIndex);
      groupIndexes.push(currentIndex);
      const current = matches[currentIndex];

      for (let candidateIndex = 0; candidateIndex < matches.length; candidateIndex += 1) {
        if (visited.has(candidateIndex) || candidateIndex === currentIndex) {
          continue;
        }

        const candidate = matches[candidateIndex];
        if (candidate.fruit !== current.fruit) {
          continue;
        }

        if (shareCell(current, candidate)) {
          queue.push(candidateIndex);
        }
      }
    }

    const groups = groupIndexes.map((groupIndex) => matches[groupIndex]);
    const cells = getMatchedCells(groups);
    const primaryGroup = groups.reduce((earliest, group) =>
      matches.indexOf(group) < matches.indexOf(earliest) ? group : earliest,
    );

    clusters.push({
      primaryGroup,
      groups,
      fruit: primaryGroup.fruit,
      cells,
      size: cells.length,
      tier: getMatchTier(cells.length),
    });
  }

  return clusters;
}

function pickSpecialCellPositionForCluster(cluster: MatchCluster, movedCell?: Position): Position {
  if (movedCell && cluster.cells.some((cell) => isSamePosition(cell, movedCell))) {
    return movedCell;
  }

  const counts = new Map<string, { cell: Position; count: number }>();
  for (const group of cluster.groups) {
    for (const cell of group.cells) {
      const key = `${cell.row}:${cell.col}`;
      const current = counts.get(key);
      counts.set(key, {
        cell,
        count: (current?.count ?? 0) + 1,
      });
    }
  }

  const overlapCell = [...counts.values()]
    .filter((entry) => entry.count > 1)
    .map((entry) => entry.cell)
    .sort((left, right) => (left.row === right.row ? left.col - right.col : left.row - right.row))[0];

  if (overlapCell) {
    return overlapCell;
  }

  return pickSpecialCellPosition(cluster.primaryGroup, movedCell);
}

function selectFirstLongMatchSpecial(
  clusters: MatchCluster[],
  movedCell?: Position,
): SpecialCreation | null {
  const cluster = clusters.find((candidate) => candidate.tier >= 4);
  const special = cluster ? getSpecialCellKindForMatch(toEffectiveMatch(cluster)) : null;

  if (!cluster || !special) {
    return null;
  }

  return {
    cluster,
    position: pickSpecialCellPositionForCluster(cluster, movedCell),
    special: {
      type: 'special',
      fruit: special.fruit,
      kind: special.kind,
      powerTier: special.powerTier,
    },
  };
}

export type ResolveSwapResult = EngineState & {
  accepted: boolean;
  reason?: string;
  cascadeCount: number;
  clearedCells: number;
  scoreDelta: number;
  reshuffle?: ReshuffleEvent;
};

export type ResolveBoardMatchesResult = EngineState & {
  cascadeCount: number;
  clearedCells: number;
  scoreDelta: number;
  reshuffle?: ReshuffleEvent;
};

export function ensurePlayableBoard(
  board: Board,
  options: EnsurePlayableOptions = {},
): { board: Board; wasDeadBoard: boolean; wasReshuffled: boolean } {
  if (hasAvailableMoves(board)) {
    return {
      board,
      wasDeadBoard: false,
      wasReshuffled: false,
    };
  }

  options.onDeadBoard?.(board);

  if (!options.reshuffle) {
    return {
      board,
      wasDeadBoard: true,
      wasReshuffled: false,
    };
  }

  const reshuffled = options.reshuffle(board);
  options.onReshuffle?.({ before: board, after: reshuffled });

  return {
    board: reshuffled,
    wasDeadBoard: true,
    wasReshuffled: true,
  };
}

export function resolveBoardMatches(
  state: EngineState,
  options: ResolveBoardMatchesOptions,
): ResolveBoardMatchesResult {
  let board = state.board;
  let score = state.score;
  let cascadeCount = 0;
  let clearedCells = 0;
  let timelineKey = options.timelineKeyStart ?? 0;

  function nextTimelineKey() {
    const key = timelineKey;
    timelineKey += 1;
    return key;
  }

  while (true) {
    const rawMatches = findMatches(board);
    if (rawMatches.length === 0) {
      break;
    }

    const clusters = buildMatchClusters(rawMatches);
    const matches = clusters.map(toEffectiveMatch);

    cascadeCount += 1;
    const cells = getMatchedCells(matches);
    const points = getMatchScore(matches) * cascadeCount;
    const specialCreation = selectFirstLongMatchSpecial(
      clusters,
      cascadeCount === 1 ? options.movedCell : undefined,
    );
    const visualClearMatches = getVisualClearMatches(clusters, specialCreation);
    const visualClearedCells = getMatchedCells(visualClearMatches);
    const cellsToClear = specialCreation
      ? cells.filter((cell) => !isSamePosition(cell, specialCreation.position))
      : cells;

    clearedCells += cells.length;
    score += points;
    const cleared = clearMatchedCells(board, cellsToClear);
    if (specialCreation) {
      cleared[specialCreation.position.row][specialCreation.position.col] = specialCreation.special;
    }
    const cause = cascadeCount === 1 ? (options.cause ?? 'cascade') : 'cascade';
    options.onTimelineEvent?.({
      type: 'clear',
      key: nextTimelineKey(),
      chain: cascadeCount,
      cause,
      board: cloneBoard(board),
      clearedBoard: cloneNullableBoard(cleared),
      clearedCells: visualClearedCells,
      matches: visualClearMatches,
      scoreDelta: points,
      scoreTotal: score,
    });
    if (specialCreation) {
      options.onTimelineEvent?.({
        type: 'special-create',
        key: nextTimelineKey(),
        chain: cascadeCount,
        cause,
        board: cloneBoard(board),
        fruit: specialCreation.special.fruit,
        sourceCells: specialCreation.cluster.cells.filter(
          (cell) => !isSamePosition(cell, specialCreation.position),
        ),
        targetCell: specialCreation.position,
        special: {
          ...specialCreation.special,
        },
      });
    }
    const collapsed = collapseBoard(cleared, options.refill);
    options.onTimelineEvent?.({
      type: 'drop',
      key: nextTimelineKey(),
      chain: cascadeCount,
      cause,
      board: cloneNullableBoard(cleared),
      settledBoard: cloneBoard(collapsed.board),
      dropMotions: collapsed.dropMotions,
    });
    options.onScore?.({
      chain: cascadeCount,
      cleared: cells.length,
      points,
      total: score,
      board: cloneBoard(board),
      settledBoard: cloneBoard(collapsed.board),
      dropMotions: collapsed.dropMotions,
      matches,
    });

    board = collapsed.board;
  }

  let reshuffle: ReshuffleEvent | undefined;
  const playable = ensurePlayableBoard(board, {
    onDeadBoard: options.onDeadBoard,
    onReshuffle: (payload) => {
      reshuffle = payload;
      options.onTimelineEvent?.({
        type: 'reshuffle',
        key: nextTimelineKey(),
        chain: cascadeCount,
        cause: 'cascade',
        before: cloneBoard(payload.before),
        after: cloneBoard(payload.after),
      });
      options.onReshuffle?.(payload);
    },
    reshuffle: options.reshuffle,
  });

  return {
    board: playable.board,
    score,
    movesUsed: state.movesUsed,
    cascadeCount,
    clearedCells,
    scoreDelta: score - state.score,
    reshuffle,
  };
}

export function resolveSwap(
  state: EngineState,
  swap: Swap,
  options: ResolveSwapOptions,
): ResolveSwapResult {
  if (!isAdjacent(swap.from, swap.to)) {
    return {
      ...state,
      accepted: false,
      reason: 'Swap must be adjacent.',
      cascadeCount: 0,
      clearedCells: 0,
      scoreDelta: 0,
    };
  }

  const swapped = swapCells(state.board, swap.from, swap.to);
  const fromCell = state.board[swap.from.row]?.[swap.from.col];
  const toCell = state.board[swap.to.row]?.[swap.to.col];
  const fromWasSpecial = Boolean(fromCell && isSpecialCell(fromCell));
  const toWasSpecial = Boolean(toCell && isSpecialCell(toCell));

  // Task 4 v1 rule: if both swapped cells are special, only the special that lands on swap.to activates.
  const specialActivation = fromWasSpecial
    ? {
        position: swap.to,
        cell: swapped[swap.to.row]?.[swap.to.col],
        counterpart: swapped[swap.from.row]?.[swap.from.col],
      }
    : toWasSpecial
      ? {
          position: swap.from,
          cell: swapped[swap.from.row]?.[swap.from.col],
          counterpart: swapped[swap.to.row]?.[swap.to.col],
        }
      : null;

  if (specialActivation?.cell && isSpecialCell(specialActivation.cell)) {
    const targetFruit =
      specialActivation.cell.kind === 'color-clear' && specialActivation.counterpart
        ? specialActivation.counterpart.fruit
        : undefined;
    const clearCells = getSpecialCellClearCells(
      specialActivation.position,
      specialActivation.cell.kind,
      swapped,
      targetFruit,
    );
    const clearedPositions = uniquePositions([specialActivation.position, ...clearCells]);
    options.onTimelineEvent?.({
      type: 'special-wipe',
      key: 0,
      chain: 0,
      cause: 'swap',
      board: cloneBoard(swapped),
      origin: specialActivation.position,
      kind: specialActivation.cell.kind,
      cells: clearedPositions,
      targetFruit,
    });
    const cleared = clearMatchedCells(swapped, clearedPositions);
    const collapsed = collapseBoard(cleared, options.refill);
    options.onTimelineEvent?.({
      type: 'drop',
      key: 1,
      chain: 0,
      cause: 'swap',
      board: cloneNullableBoard(cleared),
      settledBoard: cloneBoard(collapsed.board),
      dropMotions: collapsed.dropMotions,
    });
    const resolved = resolveBoardMatches({
      ...state,
      board: collapsed.board,
      movesUsed: state.movesUsed + 1,
    }, {
      refill: options.refill,
      onScore: options.onScore,
      onTimelineEvent: options.onTimelineEvent,
      onDeadBoard: options.onDeadBoard,
      onReshuffle: options.onReshuffle,
      reshuffle: options.reshuffle,
      cause: 'swap',
      timelineKeyStart: 2,
    });

    return {
      accepted: true,
      board: resolved.board,
      score: resolved.score,
      movesUsed: resolved.movesUsed,
      cascadeCount: resolved.cascadeCount,
      clearedCells: clearedPositions.length + resolved.clearedCells,
      scoreDelta: resolved.scoreDelta,
      reshuffle: resolved.reshuffle,
    };
  }

  if (findMatches(swapped).length === 0) {
    return {
      ...state,
      accepted: false,
      reason: 'Swap must create at least one match.',
      cascadeCount: 0,
      clearedCells: 0,
      scoreDelta: 0,
    };
  }

  const resolved = resolveBoardMatches({
    ...state,
    board: swapped,
    movesUsed: state.movesUsed + 1,
  }, {
    refill: options.refill,
    onScore: options.onScore,
    onTimelineEvent: options.onTimelineEvent,
    onDeadBoard: options.onDeadBoard,
    onReshuffle: options.onReshuffle,
    reshuffle: options.reshuffle,
    cause: 'swap',
    movedCell: swap.to,
  });

  return {
    accepted: true,
    board: resolved.board,
    score: resolved.score,
    movesUsed: resolved.movesUsed,
    cascadeCount: resolved.cascadeCount,
    clearedCells: resolved.clearedCells,
    scoreDelta: resolved.scoreDelta,
    reshuffle: resolved.reshuffle,
  };
}

export function createTimer(durationMs: number, startedAtMs = 0): TimerState {
  return {
    durationMs,
    startedAtMs,
  };
}

export function getTimerSnapshot(timer: TimerState, nowMs: number) {
  const elapsedMs = Math.max(0, Math.min(nowMs - timer.startedAtMs, timer.durationMs));
  const remainingMs = Math.max(0, timer.durationMs - elapsedMs);

  return {
    durationMs: timer.durationMs,
    elapsedMs,
    remainingMs,
    expired: remainingMs === 0,
    progress: timer.durationMs === 0 ? 1 : elapsedMs / timer.durationMs,
  };
}
