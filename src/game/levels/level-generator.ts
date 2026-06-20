import {
  DIFFICULTY_BANDS,
  type DifficultyBand,
  type LevelDefinition,
  type LevelTempo,
} from './schema';

interface BandConfig {
  band: DifficultyBand;
  start: number;
  end: number;
  timeStart: number;
  timeDecay: number;
  bonusTimeEvery: number;
  targetBase: number;
  targetStep: number;
  targetBandBonus: number;
  scorePerCell: number;
  scorePerPressurePoint: number;
  tempo: LevelTempo;
}

const BAND_CONFIGS: ReadonlyArray<BandConfig> = [
  {
    band: 'gentle-onboarding',
    start: 1,
    end: 20,
    timeStart: 96,
    timeDecay: 1.1,
    bonusTimeEvery: 5,
    targetBase: 1500,
    targetStep: 165,
    targetBandBonus: 0,
    scorePerCell: 19,
    scorePerPressurePoint: 42,
    tempo: 'relaxed',
  },
  {
    band: 'rising-pressure',
    start: 21,
    end: 50,
    timeStart: 78,
    timeDecay: 0.72,
    bonusTimeEvery: 4,
    targetBase: 4800,
    targetStep: 225,
    targetBandBonus: 1700,
    scorePerCell: 22,
    scorePerPressurePoint: 51,
    tempo: 'steady',
  },
  {
    band: 'tighter-timer',
    start: 51,
    end: 80,
    timeStart: 62,
    timeDecay: 0.56,
    bonusTimeEvery: 3,
    targetBase: 9300,
    targetStep: 260,
    targetBandBonus: 4100,
    scorePerCell: 25,
    scorePerPressurePoint: 58,
    tempo: 'quick',
  },
  {
    band: 'hard-release',
    start: 81,
    end: 120,
    timeStart: 49,
    timeDecay: 0.38,
    bonusTimeEvery: 3,
    targetBase: 14800,
    targetStep: 295,
    targetBandBonus: 7800,
    scorePerCell: 28,
    scorePerPressurePoint: 66,
    tempo: 'blitz',
  },
];

function roundToNearest50(value: number): number {
  return Math.round(value / 50) * 50;
}

const BASE_TEN_LEVEL_STAR_THRESHOLDS = {
  star1: 2750,
  star2: 3550,
  star3: 4550,
} as const;

function getTenLevelScoreMultiplier(id: number): number {
  const tenLevelBlock = Math.floor((Math.max(1, id) - 1) / 10);
  return Math.pow(1.1, tenLevelBlock);
}

function getBandConfig(id: number): BandConfig {
  const config = BAND_CONFIGS.find((band) => id >= band.start && id <= band.end);
  if (!config) {
    throw new Error(`Unsupported level id ${id}`);
  }

  return config;
}

function buildTimeLimit(config: BandConfig, localIndex: number): number {
  const decay = Math.floor(localIndex * config.timeDecay);
  const periodicBonus = localIndex > 0 && localIndex % config.bonusTimeEvery === 0 ? 1 : 0;
  return config.timeStart - decay - periodicBonus;
}

export function getMoveLimitForLevelId(id: number): number {
  if (id <= 5) {
    return 50;
  }

  if (id >= 191) {
    return 15;
  }

  const startLevel = 6;
  const endLevel = 190;
  const startMoves = 49;
  const endMoves = 20;
  const progress = (id - startLevel) / (endLevel - startLevel);

  return Math.round(startMoves + (endMoves - startMoves) * progress);
}

function buildTargetScore(
  config: BandConfig,
  rows: number,
  cols: number,
  fruitTypes: number,
  timeLimitSeconds: number,
  localIndex: number,
): number {
  const boardArea = rows * cols;
  const pressureWindow = 110 - timeLimitSeconds;
  const rawScore =
    config.targetBase +
    config.targetBandBonus +
    boardArea * config.scorePerCell +
    fruitTypes * 210 +
    localIndex * config.targetStep +
    pressureWindow * config.scorePerPressurePoint;

  return roundToNearest50(rawScore);
}

function buildMetadata(
  id: number,
  band: DifficultyBand,
  bandIndex: number,
  rows: number,
  cols: number,
  fruitTypes: number,
  timeLimitSeconds: number,
  targetScore: number,
  seed: number,
  tempo: LevelTempo,
  bandOrder: number,
) {
  const code = `FS-${String(id).padStart(3, '0')}`;
  const targetPerSecond = Math.max(1, Math.round(targetScore / timeLimitSeconds));
  const pressure =
    bandOrder * 24 +
    bandIndex +
    Math.round((fruitTypes - 3) * 5 + (100 - timeLimitSeconds) / 2);

  return {
    code,
    bandIndex,
    targetPerSecond,
    pressure,
    signature: `${code}-${band}-${rows}x${cols}-f${fruitTypes}-t${timeLimitSeconds}-s${seed}`,
    tempo,
  };
}

export function createLevelDefinition(id: number): LevelDefinition {
  const config = getBandConfig(id);
  const localIndex = id - config.start;
  const bandOrder = DIFFICULTY_BANDS.indexOf(config.band) + 1;
  const bandIndex = localIndex + 1;
  const rows = 8;
  const cols = 6;
  const fruitTypes = 5;
  const timeLimitSeconds = buildTimeLimit(config, localIndex);
  const moveLimit = getMoveLimitForLevelId(id);
  const scoreMultiplier = getTenLevelScoreMultiplier(id);
  const star1 = roundToNearest50(BASE_TEN_LEVEL_STAR_THRESHOLDS.star1 * scoreMultiplier);
  const star2 = roundToNearest50(BASE_TEN_LEVEL_STAR_THRESHOLDS.star2 * scoreMultiplier);
  const star3 = roundToNearest50(BASE_TEN_LEVEL_STAR_THRESHOLDS.star3 * scoreMultiplier);
  const targetScore = star3;
  const seed = 1000 + id * 97 + bandOrder * 389 + bandIndex * 17;

  return {
    id,
    rows,
    cols,
    fruitTypes,
    timeLimitSeconds,
    moveLimit,
    targetScore,
    star1,
    star2,
    star3,
    difficultyBand: config.band,
    seed,
    metadata: buildMetadata(
      id,
      config.band,
      bandIndex,
      rows,
      cols,
      fruitTypes,
      timeLimitSeconds,
      targetScore,
      seed,
      config.tempo,
      bandOrder,
    ),
  };
}

export function createLevelCatalog(totalLevels = 120): LevelDefinition[] {
  return Array.from({ length: totalLevels }, (_, index) => createLevelDefinition(index + 1));
}
