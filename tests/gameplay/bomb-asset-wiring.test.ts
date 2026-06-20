import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('bomb booster asset wiring', () => {
  it('keeps the booster button and falling bomb on separate source assets', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain(
      "const gameplayBombButton = require('../../../assets/fruity/Buttons/Bomb/BombButton.png');",
    );
    expect(runtimeAssets).toContain(
      "const gameplayBombDrop = require('../../../assets/fruity/Buttons/Bomb/Bomb.png');",
    );
    expect(levelScreen).toContain('bombDropSource={uiRuntimeAssets.gameplayBombDrop}');
    expect(levelScreen).not.toContain('bombDropSource={uiRuntimeAssets.gameplayBombButton}');
  });

  it('preloads active booster effect images before they are used', () => {
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');

    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayBombDrop');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayBombExploded');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayLineRocketImage');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayLineRocketThrustBig');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayLineRocketThrustSmall');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayFruityCrossGroup');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayFruityCrossTop');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayFruityCrossDown');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayFruityCrossLeft');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayFruityCrossRight');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayLightningComeDown');
    expect(preloadAssets).toContain('uiRuntimeAssets.gameplayGroundLightning');
    expect(preloadAssets).toContain('vfxRuntimeAssets.bombShockwave');
    expect(preloadAssets).toContain('vfxRuntimeAssets.mysteryCloud');
    expect(preloadAssets).toContain('vfxRuntimeAssets.splashSparkle');
    expect(preloadAssets).toContain('...Object.values(vfxRuntimeAssets.seedSparkByFruit)');
  });
});
