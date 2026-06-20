import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('results screen background wiring', () => {
  it('uses the finish screen background asset behind the results content', () => {
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');
    const resultsScreen = readFileSync(path.join(projectRoot, 'app/results.tsx'), 'utf8');

    expect(runtimeAssets).toContain(
      "const finishBackground = require('../../../assets/FinishScreen/FinishBackGround.png');",
    );
    expect(runtimeAssets).toContain('finish: finishBackground');
    expect(resultsScreen).toContain('ImageBackground');
    expect(resultsScreen).toContain('source={backgroundRuntimeAssets.finish}');
    expect(resultsScreen).toContain('resizeMode="cover"');
  });
});
