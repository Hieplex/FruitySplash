import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('bomb booster audio wiring', () => {
  it('plays the bomb effect when BombExploded appears', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain(
      "const bombEffectSound = require('../../../assets/fruity/Buttons/Bomb/BombEffect.mp3');",
    );
    expect(runtimeAssets).toContain('bombEffect: bombEffectSound');
    expect(preloadAssets).toContain('soundRuntimeAssets.bombEffect');
    expect(levelScreen).toContain('useAudioPlayer(soundRuntimeAssets.bombEffect');
    expect(levelScreen).toContain('BOMB_DROP_DURATION_MS + BOMB_IMPACT_DURATION_MS');
    expect(levelScreen).toContain('playBombEffectSound(BOMB_DROP_DURATION_MS + BOMB_IMPACT_DURATION_MS)');
  });
});
