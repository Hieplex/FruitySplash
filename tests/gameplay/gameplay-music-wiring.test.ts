import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('gameplay background music wiring', () => {
  it('loads and loops the gameplay background music on the level screen', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const preloadAssets = readFileSync(path.join(projectRoot, 'src/game/assets/preload-assets.native.ts'), 'utf8');
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');

    expect(runtimeAssets).toContain("const gameplayBackgroundMusic = require('../../../assets/GamePlay/BackGroundMusic.mp3');");
    expect(runtimeAssets).toContain('gameplayBackgroundMusic');
    expect(preloadAssets).toContain('soundRuntimeAssets.gameplayBackgroundMusic');
    expect(levelScreen).toContain('useAudioPlayer(soundRuntimeAssets.gameplayBackgroundMusic');
    expect(levelScreen).toContain('gameplayMusicPlayer.loop = true');
    expect(levelScreen).toContain('gameplayMusicPlayer.play()');
    expect(levelScreen).toContain('gameplayMusicPlayer.pause()');
    expect(levelScreen).not.toContain('return () => {\n      gameplayMusicPlayer.pause();\n    };');
  });
});
