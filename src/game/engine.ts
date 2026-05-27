import { hasAvailableMoves, isAdjacent, swapCells } from './board';
import { clearMatchedCells, collapseBoard } from './gravity';
import { findMatches, getMatchedCells } from './match';
import type {
  Board,
  EngineState,
  RefillSource,
  ScoreEvent,
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
  onDeadBoard?: (board: Board) => void;
  onReshuffle?: (payload: ReshuffleEvent) => void;
  reshuffle?: (board: Board) => Board;
};

type ResolveBoardMatchesOptions = ResolveSwapOptions;

type EnsurePlayableOptions = {
  onDeadBoard?: (board: Board) => void;
  onReshuffle?: (payload: ReshuffleEvent) => void;
  reshuffle?: (board: Board) => Board;
};

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

  while (true) {
    const matches = findMatches(board);
    if (matches.length === 0) {
      break;
    }

    cascadeCount += 1;
    const cells = getMatchedCells(matches);
    const points = cells.length * 10 * cascadeCount;

    clearedCells += cells.length;
    score += points;
    const cleared = clearMatchedCells(board, cells);
    const collapsed = collapseBoard(cleared, options.refill);
    options.onScore?.({
      chain: cascadeCount,
      cleared: cells.length,
      points,
      total: score,
      board: board.map((row) => [...row]),
      settledBoard: collapsed.board.map((row) => [...row]),
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
    onDeadBoard: options.onDeadBoard,
    onReshuffle: options.onReshuffle,
    reshuffle: options.reshuffle,
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
