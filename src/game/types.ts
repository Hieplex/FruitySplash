export type Fruit = number;

export type Board = Fruit[][];

export type NullableBoard = Array<Array<Fruit | null>>;

export type Axis = 'row' | 'column';

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
  cells: Position[];
};

export type RefillSource = {
  next(position: Position): Fruit;
};

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
