import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('FruityCross audio wiring', () => {
  it('plays the cross effect when the four pieces split out', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain(
      "const fruityCrossEffectSound = require('../../../assets/fruity/Buttons/FruityCross/CrossEffect.mp3');",
    );
    expect(runtimeAssets).toContain('fruityCrossEffect: fruityCrossEffectSound');
    expect(preloadAssets).toContain('soundRuntimeAssets.fruityCrossEffect');
    expect(levelScreen).toContain('useAudioPlayer(soundRuntimeAssets.fruityCrossEffect');
    expect(levelScreen).toContain('FRUITY_CROSS_SPLIT_LAUNCH_MS');
    expect(levelScreen).toContain("if (job.sourceTool === 'fruityCross') {");
    expect(levelScreen).toContain('playFruityCrossEffectSound(FRUITY_CROSS_SPLIT_LAUNCH_MS)');
  });
});
