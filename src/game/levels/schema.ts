export const DIFFICULTY_BANDS = [
  'gentle-onboarding',
  'rising-pressure',
  'tighter-timer',
  'hard-release',
] as const;

export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number];

export type LevelTempo = 'relaxed' | 'steady' | 'quick' | 'blitz';

export interface LevelMetadata {
  code: string;
  bandIndex: number;
  targetPerSecond: number;
  pressure: number;
  signature: string;
  tempo: LevelTempo;
}

export interface LevelDefinition {
  id: number;
  rows: number;
  cols: number;
  fruitTypes: number;
  timeLimitSeconds: number;
  moveLimit: number;
  targetScore: number;
  star1: number;
  star2: number;
  star3: number;
  difficultyBand: DifficultyBand;
  seed: number;
  metadata: LevelMetadata;
}

const BAND_ID_RANGES: ReadonlyArray<readonly [number, number, DifficultyBand]> = [
  [1, 20, 'gentle-onboarding'],
  [21, 50, 'rising-pressure'],
  [51, 80, 'tighter-timer'],
  [81, 120, 'hard-release'],
];

export function getExpectedDifficultyBand(id: number): DifficultyBand | null {
  for (const [start, end, band] of BAND_ID_RANGES) {
    if (id >= start && id <= end) {
      return band;
    }
  }

  return null;
}

export function validateLevel(level: LevelDefinition): string[] {
  const issues: string[] = [];

  if (!Number.isInteger(level.id) || level.id < 1) {
    issues.push('id must be a positive integer');
  }

  if (level.rows !== 8) {
    issues.push('rows must be exactly 8');
  }

  if (level.cols !== 6) {
    issues.push('cols must be exactly 6');
  }

  if (level.fruitTypes !== 5) {
    issues.push('fruitTypes must be exactly 5');
  }

  if (
    !Number.isInteger(level.timeLimitSeconds) ||
    level.timeLimitSeconds < 30 ||
    level.timeLimitSeconds > 120
  ) {
    issues.push('timeLimitSeconds must be between 30 and 120');
  }

  if (!Number.isInteger(level.moveLimit) || level.moveLimit < 15 || level.moveLimit > 50) {
    issues.push('moveLimit must be an integer between 15 and 50');
  }

  if (!Number.isInteger(level.targetScore) || level.targetScore < 1000) {
    issues.push('targetScore must be an integer >= 1000');
  }

  if (!(level.star1 < level.star2 && level.star2 < level.star3)) {
    issues.push('star thresholds must be strictly ascending');
  }

  if (level.targetScore < level.star2) {
    issues.push('targetScore must not be below the two-star threshold');
  }

  if (level.targetScore !== level.star3) {
    issues.push('targetScore must match the three-star threshold');
  }

  if (getExpectedDifficultyBand(level.id) !== level.difficultyBand) {
    issues.push('difficultyBand does not match the expected id range');
  }

  if (!Number.isInteger(level.seed) || level.seed <= 0) {
    issues.push('seed must be a positive integer');
  }

  if (level.metadata.code !== `FS-${String(level.id).padStart(3, '0')}`) {
    issues.push('metadata.code must match the level id');
  }

  if (!Number.isInteger(level.metadata.bandIndex) || level.metadata.bandIndex < 1) {
    issues.push('metadata.bandIndex must be a positive integer');
  }

  if (
    !Number.isInteger(level.metadata.targetPerSecond) ||
    level.metadata.targetPerSecond <= 0
  ) {
    issues.push('metadata.targetPerSecond must be a positive integer');
  }

  if (!Number.isInteger(level.metadata.pressure) || level.metadata.pressure < 1) {
    issues.push('metadata.pressure must be a positive integer');
  }

  if (!level.metadata.signature || !level.metadata.signature.includes(level.metadata.code)) {
    issues.push('metadata.signature must include the level code');
  }

  if (!['relaxed', 'steady', 'quick', 'blitz'].includes(level.metadata.tempo)) {
    issues.push('metadata.tempo must be a known tempo value');
  }

  return issues;
}

export function validateLevelCollection(levels: readonly LevelDefinition[]): void {
  if (levels.length !== 120) {
    throw new Error(`Expected 120 levels but received ${levels.length}`);
  }

  const seenSignatures = new Set<string>();

  for (const [index, level] of levels.entries()) {
    const expectedId = index + 1;

    if (level.id !== expectedId) {
      throw new Error(`Level at index ${index} must have id ${expectedId}`);
    }

    const issues = validateLevel(level);
    if (issues.length > 0) {
      throw new Error(`Level ${level.id} is invalid: ${issues.join('; ')}`);
    }

    if (seenSignatures.has(level.metadata.signature)) {
      throw new Error(`Level ${level.id} reuses metadata.signature`);
    }

    seenSignatures.add(level.metadata.signature);
  }
}
