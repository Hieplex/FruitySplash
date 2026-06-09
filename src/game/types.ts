export type Fruit = number;

export type Board = BoardCell[][];

export type NullableBoard = Array<Array<BoardCell | null>>;

export type Axis = 'row' | 'column';

export type MatchTier = 3 | 4 | 5 | 6 | 7;

export type SpecialMatchTier = Exclude<MatchTier, 3>;

export type SpecialCellKind = 'row-wipe' | 'column-wipe' | 'cross-wipe' | 'color-clear';

export type NormalCell = {
  type: 'fruit';
  fruit: Fruit;
};

export type SpecialCell = {
  type: 'special';
  fruit: Fruit;
  kind: SpecialCellKind;
  powerTier: SpecialMatchTier;
};

export type BoardCell = NormalCell | SpecialCell;

export type Position = {
  row: number;
  col: number;
};

export type Swap = {
  from: Position;
  to: Position;
};

export type MatchGroup = {
  axis: Axis;
  fruit: Fruit;
  size: number;
  tier: MatchTier;
  cells: Position[];
};

export type RefillSource = {
  next(position: Position): Fruit;
};

export type RowClearTravelDirection = 'left-to-right' | 'right-to-left';

export type ScoreEvent = {
  chain: number;
  cleared: number;
  points: number;
  total: number;
  board: Board;
  settledBoard: Board;
  dropMotions: DropMotion[];
  matches: MatchGroup[];
};

export type CascadeTimelineCause = 'swap' | 'bomb' | 'hammer' | 'power' | 'cascade';

export type CascadeTimelineClearEvent = {
  type: 'clear';
  key: number;
  chain: number;
  cause: CascadeTimelineCause;
  board: Board;
  clearedBoard: NullableBoard;
  clearedCells: Position[];
  matches: MatchGroup[];
  scoreDelta: number;
  scoreTotal: number;
};

export type CascadeTimelineDropEvent = {
  type: 'drop';
  key: number;
  chain: number;
  cause: CascadeTimelineCause;
  board: NullableBoard;
  settledBoard: Board;
  dropMotions: DropMotion[];
};

export type CascadeTimelineSpecialCreateEvent = {
  type: 'special-create';
  key: number;
  chain: number;
  cause: CascadeTimelineCause;
  board: Board;
  fruit: Fruit;
  sourceCells: Position[];
  targetCell: Position;
  special: SpecialCell;
};

export type CascadeTimelineSpecialWipeEvent = {
  type: 'special-wipe';
  key: number;
  chain: number;
  cause: CascadeTimelineCause;
  board: Board;
  origin: Position;
  kind: SpecialCellKind;
  cells: Position[];
  targetFruit?: Fruit;
  sourceTool?: 'lineRocket' | 'fruityCross';
  rowTravelDirection?: RowClearTravelDirection;
};

export type CascadeTimelineReshuffleEvent = {
  type: 'reshuffle';
  key: number;
  chain: number;
  cause: CascadeTimelineCause;
  before: Board;
  after: Board;
};

export type CascadeTimelineEvent =
  | CascadeTimelineClearEvent
  | CascadeTimelineDropEvent
  | CascadeTimelineSpecialCreateEvent
  | CascadeTimelineSpecialWipeEvent
  | CascadeTimelineReshuffleEvent;

export type DropMotion = {
  fruit: Fruit;
  from: Position;
  to: Position;
  spawned: boolean;
};

export type EngineState = {
  board: Board;
  score: number;
  movesUsed: number;
};

export type TimerState = {
  durationMs: number;
  startedAtMs: number;
};
