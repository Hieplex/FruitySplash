import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('LightningFruits audio wiring', () => {
  it('plays the lightning effect when the LightningComeDown preview starts', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain(
      "const lightningEffectSound = require('../../../assets/fruity/Buttons/LightningFruits/LightningEffect.mp3');",
    );
    expect(runtimeAssets).toContain('lightningEffect: lightningEffectSound');
    expect(preloadAssets).toContain('soundRuntimeAssets.lightningEffect');
    expect(levelScreen).toContain('useAudioPlayer(soundRuntimeAssets.lightningEffect');
    expect(levelScreen).toContain('playLightningEffectSound(Math.round(previewDurationMs * LIGHTNING_STRIKE_START_AT))');
  });
});
