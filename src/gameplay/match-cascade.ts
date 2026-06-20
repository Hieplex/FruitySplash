import { getBombBlastCells } from '@/game/boosters/bomb';
import { getCellFruit } from '@/game/board';
import { resolveBoardMatches, type ResolveBoardMatchesResult } from '@/game/engine';
import { clearMatchedCells, collapseBoard } from '@/game/gravity';
import { getSpecialCellClearCells } from '@/game/special-cells';
import { collectSpecialChainActivations, getSpecialChainDelayMs } from '@/game/special-chain';
import {
  getLineRocketCellDelayMs,
  getLineRocketTravelDirection,
  type DirectSpecialPowerTool,
  type LineRocketTravelDirection,
} from '@/gameplay/direct-power-tools';
import {
  getFruityCrossClearDelayMs,
  getLightningFruitsChainDelayMs,
  getLineRocketClearDelayMs,
  getSpecialWipeMaxDelayMs,
  getSpecialWipeDelayMs,
  SPECIAL_WIPE_PRE_SHRINK_MS,
} from '@/gameplay/match-vfx-timing';
import type { MatchSplash, MatchSplashCell } from '@/components/match-splash-overlay';
import type {
  Board,
  CascadeTimelineEvent,
  DropMotion,
  EngineState,
  Position,
  RefillSource,
  RowClearTravelDirection,
  ScoreEvent,
  SpecialCell,
  SpecialCellKind,
  Fruit,
} from '@/game/types';

const NORMAL_MATCH_SPLASH_DURATION_MS = 240;
const NORMAL_MATCH_PRE_SHRINK_MS = 70;
const BOOSTER_CLEAR_SCORE_PER_CELL = 20;

export type MatchStep = {
  board: Board;
  settledBoard: Board;
  dropMotions: DropMotion[];
  splash: MatchSplash;
};

export type CascadeSequenceJob =
  | {
      type: 'splash';
      key: number;
      board: Board;
      splash: MatchSplash;
      overlappedDrop?: OverlappedDropAnimationPayload;
    }
  | {
      type: 'bomb-clear';
      key: number;
      board: Board;
      target: Position;
      cells: Position[];
    }
  | {
      type: 'drop';
      key: number;
      board: Board;
      motions: DropMotion[];
      hiddenCells?: Position[];
      startDelaysByColumn?: Record<number, number>;
    }
  | {
      type: 'special-merge';
      key: number;
      board: Board;
      fruit: Fruit;
      sourceCells: Position[];
      hiddenCells?: Position[];
      targetCell: Position;
      special: SpecialCell;
      companionSplash?: MatchSplash;
      overlappedDrop?: OverlappedDropAnimationPayload;
    }
    | {
        type: 'special-wipe';
        key: number;
        board: Board;
        origin: Position;
        kind: SpecialCellKind;
        cells: Position[];
        triggeredBy?: Position;
        triggerDelayMs?: number;
        targetFruit?: Fruit;
        sourceTool?: DirectSpecialPowerTool;
        rowTravelDirection?: RowClearTravelDirection;
        chainedWipes?: SpecialWipeChain[];
        overlappedDrop?: OverlappedDropAnimationPayload;
      }
  | {
      type: 'reshuffle';
      key: number;
      before: Board;
      after: Board;
    };

export type ResolvedState = EngineState & {
  reshuffle?: ResolveBoardMatchesResult['reshuffle'];
};

export type SpecialWipeChain = {
  key: number;
  origin: Position;
  kind: SpecialCellKind;
  cells: Position[];
  triggeredBy?: Position;
  triggerDelayMs: number;
  targetFruit?: Fruit;
};

type DropAnimationPayload = {
  key: number;
  motions: DropMotion[];
  hiddenCells?: Position[];
  startDelaysByColumn?: Record<number, number>;
};

type OverlappedDropAnimationPayload = DropAnimationPayload & {
  board: Board;
};

type ResolveBombClearSequenceOptions = {
  key: number;
  target: Position;
  board: Board;
  engineState: EngineState;
  refill: RefillSource;
  cascadeRefill: RefillSource;
  reshuffle?: (board: Board) => Board;
};

type DirectSpecialPowerKind = Extract<SpecialCellKind, 'row-wipe' | 'cross-wipe' | 'color-clear'>;

type ResolveDirectSpecialPowerSequenceOptions = {
  key: number;
  target: Position;
  tool?: DirectSpecialPowerTool;
  kind: DirectSpecialPowerKind;
  board: Board;
  engineState: EngineState;
  refill: RefillSource;
  cascadeRefill: RefillSource;
  reshuffle?: (board: Board) => Board;
};

export type BombClearSequence = {
  blastCells: Position[];
  clearedBoard: ReturnType<typeof clearMatchedCells>;
  clearedDropMotions: DropMotion[];
  dropAnimation: DropAnimationPayload;
  steps: MatchStep[];
  jobs: CascadeSequenceJob[];
  state: ResolvedState;
};

export type DirectSpecialPowerSequence = {
  clearCells: Position[];
  clearedBoard: ReturnType<typeof clearMatchedCells>;
  clearedDropMotions: DropMotion[];
  settledBoard: Board;
  jobs: CascadeSequenceJob[];
  state: ResolvedState;
  targetFruit?: Fruit;
};

function uniquePositions(cells: Position[]) {
  const unique = new Map<string, Position>();

  cells.forEach((cell) => {
    unique.set(`${cell.row}:${cell.col}`, cell);
  });

  return [...unique.values()];
}

function positionKey(cell: Position) {
  return `${cell.row}:${cell.col}`;
}

function isSamePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col;
}

function filterLightningRootCellsForChainedSpecialWipes(
  clearCells: Position[],
  chainActivations: ReturnType<typeof collectSpecialChainActivations>,
  target: Position,
) {
  if (chainActivations.length === 0) {
    return clearCells;
  }

  const rootKeepCells = new Set<string>([positionKey(target)]);
  const chainedSpecialClaimedCells = new Set<string>();

  chainActivations.forEach((activation) => {
    activation.cells.forEach((cell) => {
      if (!isSamePosition(cell, target)) {
        chainedSpecialClaimedCells.add(positionKey(cell));
      }
    });
  });

  return clearCells.filter((cell) => {
    const key = positionKey(cell);
    return rootKeepCells.has(key) || !chainedSpecialClaimedCells.has(key);
  });
}

function getLineRocketRowCells(row: number, columnCount: number, direction: LineRocketTravelDirection) {
  const cells = Array.from({ length: columnCount }, (_, col) => ({ row, col }));
  return direction === 'left-to-right' ? cells : cells.reverse();
}

function createMatchSplash(key: number, event: ScoreEvent): MatchSplash | null {
  const cells = new Map<string, MatchSplashCell>();
  for (const match of event.matches) {
    for (const cell of match.cells) {
      cells.set(`${cell.row}:${cell.col}`, {
        ...cell,
        fruit: match.fruit,
      });
    }
  }

  if (cells.size === 0) {
    return null;
  }

  return {
    key,
    chain: event.chain,
    durationMs: NORMAL_MATCH_SPLASH_DURATION_MS,
    preShrinkMs: event.matches.every((match) => match.tier === 3) ? NORMAL_MATCH_PRE_SHRINK_MS : undefined,
    cells: [...cells.values()],
  };
}

function createDropStartDelaysByColumn(splash: MatchSplash) {
  const delaysByColumn: Record<number, number> = {};
  const preShrinkMs = splash.preShrinkMs ?? 0;

  for (const cell of splash.cells) {
    const delayMs = (cell.delayMs ?? 0) + preShrinkMs;
    delaysByColumn[cell.col] = Math.max(delaysByColumn[cell.col] ?? 0, delayMs);
  }

  return delaysByColumn;
}

function createDropPayload(
  event: Extract<CascadeTimelineEvent, { type: 'drop' }>,
  options: {
    hiddenCells?: Position[];
    startDelaysByColumn?: Record<number, number>;
  } = {},
): OverlappedDropAnimationPayload {
  return {
    key: event.key,
    board: event.settledBoard,
    motions: event.dropMotions,
    hiddenCells: options.hiddenCells,
    startDelaysByColumn: options.startDelaysByColumn,
  };
}

function getSplashPositions(splash?: MatchSplash) {
  return splash?.cells.map(({ row, col }) => ({ row, col }));
}

export function createMatchSteps(key: number, scoreEvents: ScoreEvent[]): MatchStep[] {
  return scoreEvents.flatMap((event, index) => {
    const splash = createMatchSplash(key + index, event);
    return splash
      ? [
          {
            board: event.board,
            settledBoard: event.settledBoard,
            dropMotions: event.dropMotions,
            splash,
          },
        ]
      : [];
  });
}

export function createCascadeSequenceJobsFromTimeline(
  events: CascadeTimelineEvent[],
  options: { hiddenCellsByDropKey?: Map<number, Position[]> } = {},
): CascadeSequenceJob[] {
  const jobs: CascadeSequenceJob[] = [];
  let pendingClearEvent: Extract<CascadeTimelineEvent, { type: 'clear' }> | null = null;
  let currentRootSpecialWipeJob: Extract<CascadeSequenceJob, { type: 'special-wipe' }> | null = null;

  function flushPendingClear(overlappedDropEvent?: Extract<CascadeTimelineEvent, { type: 'drop' }>) {
    if (!pendingClearEvent) {
      return;
    }

    const splash = createMatchSplash(pendingClearEvent.key, {
      chain: pendingClearEvent.chain,
      cleared: pendingClearEvent.clearedCells.length,
      points: pendingClearEvent.scoreDelta,
      total: pendingClearEvent.scoreTotal,
      board: pendingClearEvent.board,
      settledBoard: pendingClearEvent.board,
      dropMotions: [],
      matches: pendingClearEvent.matches,
    });

    if (splash) {
      const overlappedDrop = overlappedDropEvent
        ? createDropPayload(overlappedDropEvent, {
            hiddenCells: options.hiddenCellsByDropKey?.get(overlappedDropEvent.key),
            startDelaysByColumn: createDropStartDelaysByColumn(splash),
          })
        : undefined;

      jobs.push({
        type: 'splash',
        key: pendingClearEvent.key,
        board: pendingClearEvent.board,
        splash,
        overlappedDrop,
      });
    }

    pendingClearEvent = null;
  }

  for (const event of events) {
    if (event.type === 'clear') {
      flushPendingClear();
      pendingClearEvent = event;
      currentRootSpecialWipeJob = null;
      continue;
    }

    if (event.type === 'drop') {
      currentRootSpecialWipeJob = null;
      if (pendingClearEvent) {
        flushPendingClear(event);
        continue;
      }

      jobs.push({
        type: 'drop',
        key: event.key,
        board: event.settledBoard,
        motions: event.dropMotions,
        hiddenCells: options.hiddenCellsByDropKey?.get(event.key),
        startDelaysByColumn: undefined,
      });
      continue;
    }

    if (event.type === 'special-create') {
      currentRootSpecialWipeJob = null;
      const companionSplash = pendingClearEvent
        ? createMatchSplash(event.key, {
            chain: pendingClearEvent.chain,
            cleared: pendingClearEvent.clearedCells.length,
            points: pendingClearEvent.scoreDelta,
            total: pendingClearEvent.scoreTotal,
            board: pendingClearEvent.board,
            settledBoard: pendingClearEvent.board,
            dropMotions: [],
            matches: pendingClearEvent.matches,
          })
        : null;
      jobs.push({
        type: 'special-merge',
        key: event.key,
        board: event.board,
        fruit: event.fruit,
        sourceCells: event.sourceCells,
        hiddenCells: undefined,
        targetCell: event.targetCell,
        special: event.special,
        companionSplash: companionSplash ?? undefined,
      });
      pendingClearEvent = null;
      continue;
    }

    if (event.type === 'special-wipe') {
      flushPendingClear();
      if ((event.triggeredBy || event.triggerDelayMs) && currentRootSpecialWipeJob) {
        currentRootSpecialWipeJob.chainedWipes = [
          ...(currentRootSpecialWipeJob.chainedWipes ?? []),
          {
            key: event.key,
            origin: event.origin,
            kind: event.kind,
            cells: event.cells,
            triggeredBy: event.triggeredBy,
            triggerDelayMs: event.triggerDelayMs ?? 0,
            targetFruit: event.targetFruit,
          },
        ];
        continue;
      }

      const wipeJob: Extract<CascadeSequenceJob, { type: 'special-wipe' }> = {
        type: 'special-wipe',
        key: event.key,
        board: event.board,
        origin: event.origin,
        kind: event.kind,
        cells: event.cells,
        triggeredBy: event.triggeredBy,
        triggerDelayMs: event.triggerDelayMs,
        targetFruit: event.targetFruit,
        sourceTool: event.sourceTool,
        rowTravelDirection: event.rowTravelDirection,
      };
      jobs.push(wipeJob);
      currentRootSpecialWipeJob = wipeJob;
      continue;
    }

    flushPendingClear();
    currentRootSpecialWipeJob = null;
    jobs.push({
      type: 'reshuffle',
      key: event.key,
      before: event.before,
      after: event.after,
    });
  }

  flushPendingClear();

  for (let index = 0; index < jobs.length - 1; index += 1) {
    const job = jobs[index];
    const nextJob = jobs[index + 1];
    if (job.type !== 'special-merge' || nextJob.type !== 'drop' || nextJob.motions.length === 0) {
      continue;
    }

    job.overlappedDrop = {
      key: nextJob.key,
      board: nextJob.board,
      motions: nextJob.motions,
      hiddenCells: nextJob.hiddenCells ?? getSplashPositions(job.companionSplash),
      startDelaysByColumn:
        nextJob.startDelaysByColumn ??
        (job.companionSplash ? createDropStartDelaysByColumn(job.companionSplash) : undefined),
    };
    jobs.splice(index + 1, 1);
  }

  return jobs;
}

export function resolveBombClearSequence({
  key,
  target,
  board,
  engineState,
  refill,
  cascadeRefill,
  reshuffle,
}: ResolveBombClearSequenceOptions): BombClearSequence {
  const blastCells = getBombBlastCells(target, board);
  const bombScore = blastCells.length * BOOSTER_CLEAR_SCORE_PER_CELL;
  const clearedBoard = clearMatchedCells(board, blastCells);
  const collapsed = collapseBoard(clearedBoard, refill);
  const scoreEvents: ScoreEvent[] = [];
  const timelineEvents: CascadeTimelineEvent[] = [];
  const state = resolveBoardMatches(
    {
      ...engineState,
      board: collapsed.board,
      score: engineState.score + bombScore,
    },
    {
      refill: cascadeRefill,
      onScore: (event) => scoreEvents.push(event),
      onTimelineEvent: (event) => timelineEvents.push(event),
      reshuffle,
      cause: 'bomb',
    },
  );
  const dropAnimation = {
    key,
    motions: collapsed.dropMotions,
    hiddenCells: blastCells,
  };
  const jobs = [
    {
      type: 'bomb-clear' as const,
      key,
      board,
      target,
      cells: blastCells,
    },
    {
      type: 'drop' as const,
      key,
      board,
      motions: collapsed.dropMotions,
      hiddenCells: blastCells,
    },
    ...createCascadeSequenceJobsFromTimeline(timelineEvents),
  ];

  return {
    blastCells,
    clearedBoard,
    clearedDropMotions: collapsed.dropMotions,
    dropAnimation,
    steps: createMatchSteps(key + 1, scoreEvents),
    jobs,
    state,
  };
}

export function resolveDirectSpecialPowerSequence({
  key,
  target,
  tool,
  kind,
  board,
  engineState,
  refill,
  cascadeRefill,
  reshuffle,
}: ResolveDirectSpecialPowerSequenceOptions): DirectSpecialPowerSequence {
  const targetCell = board[target.row]?.[target.col];
  const columnCount = board[0]?.length ?? 0;
  const targetFruit = kind === 'color-clear' && targetCell ? getCellFruit(targetCell) : undefined;
  const lineRocketDirection =
    tool === 'lineRocket' && kind === 'row-wipe'
      ? getLineRocketTravelDirection(target, columnCount)
      : undefined;
  const rawClearCells = lineRocketDirection
    ? getLineRocketRowCells(target.row, columnCount, lineRocketDirection)
    : uniquePositions([
        target,
        ...getSpecialCellClearCells(target, kind, board, targetFruit),
      ]);
  const lightningChainDelayMs =
    tool === 'lightningFruits' && kind === 'color-clear'
      ? getLightningFruitsChainDelayMs(getSpecialWipeMaxDelayMs(rawClearCells, target), SPECIAL_WIPE_PRE_SHRINK_MS)
      : undefined;
  const getDirectPowerChainDelayMs = (cell: Position) => {
    if (lineRocketDirection) {
      return getLineRocketClearDelayMs(
        getLineRocketCellDelayMs(cell, columnCount, lineRocketDirection),
        SPECIAL_WIPE_PRE_SHRINK_MS,
      );
    }

    if (tool === 'fruityCross' && kind === 'cross-wipe') {
      return getFruityCrossClearDelayMs(getSpecialWipeDelayMs(cell, target));
    }

    if (tool === 'lightningFruits' && kind === 'color-clear') {
      return lightningChainDelayMs ?? 0;
    }

    return getSpecialChainDelayMs(target, cell);
  };
  const chainActivations = collectSpecialChainActivations(
    board,
    rawClearCells.map((cell) => ({
      position: cell,
      triggeredBy: target,
      triggerDelayMs: getDirectPowerChainDelayMs(cell),
    })),
  );
  const clearCells =
    tool === 'lightningFruits' && kind === 'color-clear'
      ? filterLightningRootCellsForChainedSpecialWipes(rawClearCells, chainActivations, target)
      : rawClearCells;
  const allClearCells = uniquePositions([
    ...clearCells,
    ...chainActivations.flatMap((activation) => activation.cells),
  ]);
  const clearedBoard = clearMatchedCells(board, allClearCells);
  const collapsed = collapseBoard(clearedBoard, refill);
  const boosterClearScore = allClearCells.length * BOOSTER_CLEAR_SCORE_PER_CELL;
  const timelineEvents: CascadeTimelineEvent[] = [
    {
      type: 'special-wipe',
      key,
      chain: 0,
      cause: 'power',
      board,
      origin: target,
      kind,
      cells: clearCells,
      triggerDelayMs: 0,
      targetFruit,
      sourceTool: tool,
      rowTravelDirection: lineRocketDirection,
    },
    {
      type: 'drop',
      key: key + 1,
      chain: 0,
      cause: 'power',
      board: clearedBoard,
      settledBoard: collapsed.board,
      dropMotions: collapsed.dropMotions,
    },
  ];
  const state = resolveBoardMatches(
    {
      ...engineState,
      board: collapsed.board,
      score: engineState.score + boosterClearScore,
    },
    {
      refill: cascadeRefill,
      onTimelineEvent: (event) => timelineEvents.push(event),
      reshuffle,
      cause: 'power',
      timelineKeyStart: key + 2,
    },
  );
  const jobs = createCascadeSequenceJobsFromTimeline(timelineEvents);
  const firstJob = jobs[0];
  if (firstJob?.type === 'special-wipe' && chainActivations.length > 0) {
    firstJob.chainedWipes = chainActivations.map((activation, index) => ({
      key: key + 1000 + index,
      origin: activation.position,
      kind: activation.special.kind,
      cells: activation.cells,
      triggeredBy: activation.triggeredBy,
      triggerDelayMs: activation.triggerDelayMs,
      targetFruit: activation.targetFruit,
    }));
  }
  const firstDropJob = jobs[1];
  const shouldOverlapDirectPowerDrop = !(
    firstJob?.type === 'special-wipe' &&
    firstJob.sourceTool === 'lightningFruits' &&
    chainActivations.length > 0
  );
  if (
    firstJob?.type === 'special-wipe' &&
    firstJob.sourceTool !== 'fruityCross' &&
    shouldOverlapDirectPowerDrop &&
    firstDropJob?.type === 'drop' &&
    firstDropJob.motions.length > 0
  ) {
    firstJob.overlappedDrop = {
      key: firstDropJob.key,
      board: firstDropJob.board,
      motions: firstDropJob.motions,
      hiddenCells: firstJob.sourceTool === 'lightningFruits' ? clearCells : allClearCells,
      startDelaysByColumn: firstDropJob.startDelaysByColumn,
    };
    jobs.splice(1, 1);
  }

  return {
    clearCells,
    clearedBoard,
    clearedDropMotions: collapsed.dropMotions,
    settledBoard: collapsed.board,
    jobs,
    state,
    targetFruit,
  };
}

type ResolveHammerClearSequenceOptions = {
  key: number;
  target: Position;
  board: Board;
  engineState: EngineState;
  refill: RefillSource;
  cascadeRefill: RefillSource;
  reshuffle?: (board: Board) => Board;
};

export type HammerClearSequence = {
  blastCells: Position[];
  clearedBoard: ReturnType<typeof clearMatchedCells>;
  clearedDropMotions: DropMotion[];
  dropAnimation: DropAnimationPayload;
  steps: MatchStep[];
  jobs: CascadeSequenceJob[];
  state: ResolvedState;
};

export function resolveHammerClearSequence({
  key,
  target,
  board,
  engineState,
  refill,
  cascadeRefill,
  reshuffle,
}: ResolveHammerClearSequenceOptions): HammerClearSequence {
  const blastCells = [target];
  const hammerScore = blastCells.length * BOOSTER_CLEAR_SCORE_PER_CELL;
  const clearedBoard = clearMatchedCells(board, blastCells);
  const collapsed = collapseBoard(clearedBoard, refill);
  const scoreEvents: ScoreEvent[] = [];
  const timelineEvents: CascadeTimelineEvent[] = [];
  const state = resolveBoardMatches(
    {
      ...engineState,
      board: collapsed.board,
      score: engineState.score + hammerScore,
    },
    {
      refill: cascadeRefill,
      onScore: (event) => scoreEvents.push(event),
      onTimelineEvent: (event) => timelineEvents.push(event),
      reshuffle,
      cause: 'hammer',
    },
  );
  const dropAnimation = {
    key,
    motions: collapsed.dropMotions,
    hiddenCells: blastCells,
  };
  const hiddenCellsByDropKey = new Map<number, Position[]>();
  const firstDropEvent = timelineEvents.find((event): event is Extract<CascadeTimelineEvent, { type: 'drop' }> => event.type === 'drop');
  if (firstDropEvent) {
    hiddenCellsByDropKey.set(firstDropEvent.key, blastCells);
  }
  const jobs = [
    {
      type: 'drop' as const,
      key,
      board,
      motions: collapsed.dropMotions,
      hiddenCells: blastCells,
    },
    ...createCascadeSequenceJobsFromTimeline(timelineEvents, {
      hiddenCellsByDropKey,
    }),
  ];

  return {
    blastCells,
    clearedBoard,
    clearedDropMotions: collapsed.dropMotions,
    dropAnimation,
    steps: createMatchSteps(key + 1, scoreEvents),
    jobs,
    state,
  };
}

