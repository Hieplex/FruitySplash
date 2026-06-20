export const matchSplashFruitAssetIds = ['strawberry', 'apple', 'orange', 'grape', 'blueberry'] as const;

type MatchSplashParticlePlanInput = {
  key: number;
  row: number;
  col: number;
  fruit: number;
  sparkleLimit?: number;
};

export type SparkleParticle = {
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  opacity: number;
  delayMs: number;
};

const mysteryCloudTintColors = ['#ff4fb8', '#ff4a4a', '#ff9f1c', '#8d4cff', '#6a5cff'] as const;

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function seededRange(seed: number, min: number, max: number) {
  return min + seededUnit(seed) * (max - min);
}

function createSparkles(baseSeed: number, limit = Number.POSITIVE_INFINITY): SparkleParticle[] {
  const sparkleBase = [
    { startX: 0, startY: 0, driftX: 0, driftY: 0, size: 1.45, opacity: 1, delayMs: 70 },
    { startX: -0.34, startY: -0.24, driftX: -0.24, driftY: -0.22, size: 0.78, opacity: 0.98, delayMs: 110 },
    { startX: 0.34, startY: -0.2, driftX: 0.28, driftY: -0.18, size: 0.72, opacity: 0.96, delayMs: 135 },
    { startX: -0.24, startY: 0.26, driftX: -0.18, driftY: 0.2, size: 0.56, opacity: 0.92, delayMs: 175 },
    { startX: 0.26, startY: 0.28, driftX: 0.2, driftY: 0.22, size: 0.52, opacity: 0.9, delayMs: 210 },
  ] as const;

  return sparkleBase.slice(0, Math.max(0, limit)).map((sparkle, index) => {
    const seedBase = baseSeed + index * 149 + 700;

    return {
      ...sparkle,
      startX: sparkle.startX + seededRange(seedBase + 1, -0.04, 0.04),
      startY: sparkle.startY + seededRange(seedBase + 2, -0.04, 0.04),
      driftX: sparkle.driftX + seededRange(seedBase + 3, -0.08, 0.08),
      driftY: sparkle.driftY + seededRange(seedBase + 4, -0.08, 0.08),
      size: sparkle.size + seededRange(seedBase + 5, -0.04, 0.06),
      delayMs: sparkle.delayMs + Math.round(seededRange(seedBase + 6, -10, 12)),
    };
  });
}

export function createMatchSplashParticlePlan({ key, row, col, fruit, sparkleLimit }: MatchSplashParticlePlanInput) {
  const baseSeed = key * 101 + row * 37 + col * 53;
  const assetId = matchSplashFruitAssetIds[fruit] ?? matchSplashFruitAssetIds[0];

  return {
    assetId,
    mysteryCloud: {
      opacity: 0.32 + seededRange(baseSeed + 850, 0, 0.08),
      scale: 1.08 + seededRange(baseSeed + 851, 0, 0.1),
      rotate: `${Math.round(seededRange(baseSeed + 852, -14, 14))}deg`,
      tintColor: mysteryCloudTintColors[fruit] ?? mysteryCloudTintColors[0],
    },
    coreFlash: {
      opacity: 1,
      scale: 1.02 + seededRange(baseSeed + 900, 0, 0.075),
      rotate: `${Math.round(seededRange(baseSeed + 901, -10, 10))}deg`,
    },
    sparkles: createSparkles(baseSeed, sparkleLimit),
  };
}
