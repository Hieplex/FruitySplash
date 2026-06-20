import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('LineRocket audio wiring', () => {
  it('plays the rocket effect when LineRocketImg appears', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain(
      "const lineRocketEffectSound = require('../../../assets/fruity/Buttons/LineRocket/RocketEffect.mp3');",
    );
    expect(runtimeAssets).toContain('lineRocketEffect: lineRocketEffectSound');
    expect(preloadAssets).toContain('soundRuntimeAssets.lineRocketEffect');
    expect(levelScreen).toContain('useAudioPlayer(soundRuntimeAssets.lineRocketEffect');
    expect(levelScreen).toContain("if (job.sourceTool === 'lineRocket') {");
    expect(levelScreen).toContain('playLineRocketEffectSound()');
  });
});
