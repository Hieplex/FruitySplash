import { getBombBlastCells } from '@/game/boosters/bomb';
import { resolveBoardMatches, type ResolveBoardMatchesResult } from '@/game/engine';
import { clearMatchedCells, collapseBoard } from '@/game/gravity';
import type { MatchSplash, MatchSplashCell } from '@/components/match-splash-overlay';
import type { Board, DropMotion, EngineState, Position, RefillSource, ScoreEvent } from '@/game/types';

export type MatchStep = {
  board: Board;
  settledBoard: Board;
  dropMotions: DropMotion[];
  splash: MatchSplash;
};

export type ResolvedState = EngineState & {
  reshuffle?: ResolveBoardMatchesResult['reshuffle'];
};

type DropAnimationPayload = {
  key: number;
  motions: DropMotion[];
  hiddenCells?: Position[];
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

export type BombClearSequence = {
  blastCells: Position[];
  clearedBoard: ReturnType<typeof clearMatchedCells>;
  clearedDropMotions: DropMotion[];
  dropAnimation: DropAnimationPayload;
  steps: MatchStep[];
  state: ResolvedState;
};

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
    cells: [...cells.values()],
  };
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
  const bombScore = blastCells.length * 10;
  const clearedBoard = clearMatchedCells(board, blastCells);
  const collapsed = collapseBoard(clearedBoard, refill);
  const scoreEvents: ScoreEvent[] = [];
  const state = resolveBoardMatches(
    {
      ...engineState,
      board: collapsed.board,
      score: engineState.score + bombScore,
    },
    {
      refill: cascadeRefill,
      onScore: (event) => scoreEvents.push(event),
      reshuffle,
    },
  );

  return {
    blastCells,
    clearedBoard,
    clearedDropMotions: collapsed.dropMotions,
    dropAnimation: {
      key,
      motions: collapsed.dropMotions,
      hiddenCells: blastCells,
    },
    steps: createMatchSteps(key + 1, scoreEvents),
    state,
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
  const hammerScore = 10;
  const clearedBoard = clearMatchedCells(board, blastCells);
  const collapsed = collapseBoard(clearedBoard, refill);
  const scoreEvents: ScoreEvent[] = [];
  const state = resolveBoardMatches(
    {
      ...engineState,
      board: collapsed.board,
      score: engineState.score + hammerScore,
    },
    {
      refill: cascadeRefill,
      onScore: (event) => scoreEvents.push(event),
      reshuffle,
    },
  );

  return {
    blastCells,
    clearedBoard,
    clearedDropMotions: collapsed.dropMotions,
    dropAnimation: {
      key,
      motions: collapsed.dropMotions,
      hiddenCells: blastCells,
    },
    steps: createMatchSteps(key + 1, scoreEvents),
    state,
  };
}

