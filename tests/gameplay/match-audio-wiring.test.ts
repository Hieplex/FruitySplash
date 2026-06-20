import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createFruitCell } from '../../src/game/board';
import type { Board, MatchTier, ScoreEvent } from '../../src/game/types';
import { createMatchSteps } from '../../src/gameplay/match-cascade';

const projectRoot = path.resolve(__dirname, '..', '..');

function boardWithRowMatch(size: MatchTier): Board {
  return [
    Array.from({ length: size }, () => createFruitCell(0)),
    Array.from({ length: size }, (_, index) => createFruitCell(index + 1)),
  ];
}

function scoreEventForRowMatch(size: MatchTier): ScoreEvent {
  const board = boardWithRowMatch(size);

  return {
    chain: 1,
    cleared: size,
    points: size * 10,
    total: size * 10,
    board,
    settledBoard: board,
    dropMotions: [],
    matches: [
      {
        axis: 'row',
        fruit: 0,
        size,
        tier: size,
        cells: Array.from({ length: size }, (_, col) => ({ row: 0, col })),
      },
    ],
  };
}

describe('match audio wiring', () => {
  it('uses the new Matched.mp3 asset for the generic match cue', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain("const matchEffectSound = require('../../../assets/fruity/VFX/Matched.mp3');");
    expect(runtimeAssets).toContain('matchEffect: matchEffectSound');
    expect(preloadAssets).toContain('soundRuntimeAssets.matchEffect');
    expect(levelScreen).toContain('useAudioPlayer(soundRuntimeAssets.matchEffect');
    expect(levelScreen).toContain('playMatchSound(getMatchSoundDelayMs(job.splash))');
    expect(levelScreen).toContain('playMatchSound(getMatchSoundDelayMs(job.companionSplash))');
  });

  it.each([3, 4, 5, 7] as const)('keeps the match cue path active for match-%i splashes', (size) => {
    const steps = createMatchSteps(900, [scoreEventForRowMatch(size)]);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.splash.cells).toHaveLength(size);
    expect(steps[0]?.splash.cells.map((cell) => cell.col)).toEqual(
      Array.from({ length: size }, (_, col) => col),
    );
  });
});
