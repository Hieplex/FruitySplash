import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('results reward number', () => {
  it('renders the reward with booster-count text styling while keeping the count-up animation', () => {
    const resultsScreen = readFileSync(path.join(projectRoot, 'app/results.tsx'), 'utf8');
    const runtimeAssets = readFileSync(path.join(projectRoot, 'src/game/assets/runtime-assets.ts'), 'utf8');

    expect(resultsScreen).toContain('function RewardNumberText');
    expect(resultsScreen).toContain("const REWARD_NUMBER_TEXT_WEIGHT = '900'");
    expect(resultsScreen).toContain('fontWeight: REWARD_NUMBER_TEXT_WEIGHT');
    expect(resultsScreen).toContain('displayCoinReward');
    expect(resultsScreen).toContain('Animated.timing(rewardCountProgress');
    expect(resultsScreen).not.toContain("fontFamily: fontsLoaded ? 'SuperChiby' : undefined");
    expect(resultsScreen).not.toContain('RewardNumberImages');
    expect(resultsScreen).not.toContain('finishRewardNumberRuntimeAssets');
    expect(runtimeAssets).not.toContain('finishRewardNumberRuntimeAssets');
    expect(runtimeAssets).not.toContain('FinishScreen/RewardNumbers');
  });
});
