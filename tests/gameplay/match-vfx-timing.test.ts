import { describe, expect, it } from 'vitest';

import {
  FRUITY_CROSS_GROUP_DROP_MS,
  FRUITY_CROSS_SPLIT_LAUNCH_MS,
  getFruityCrossSplitStartMs,
  getFruityCrossClearDelayMs,
  getFruityCrossTravelEndMs,
  getLineRocketClearDelayMs,
  getLineRocketFadeStartMs,
  getLineRocketTravelEndMs,
  getMatchSoundDelayMs,
  LINE_ROCKET_CLEAR_LEAD_MS,
  SPECIAL_WIPE_PRE_SHRINK_MS,
} from '../../src/gameplay/match-vfx-timing';

describe('match vfx timing', () => {
  it('keeps match-5 pre-shrink short before the first vfx frame', () => {
    expect(SPECIAL_WIPE_PRE_SHRINK_MS).toBeLessThanOrEqual(70);
  });

  it('plays the match sound when vfx begins after pre-shrink', () => {
    expect(getMatchSoundDelayMs({ preShrinkMs: SPECIAL_WIPE_PRE_SHRINK_MS })).toBe(SPECIAL_WIPE_PRE_SHRINK_MS);
    expect(getMatchSoundDelayMs({})).toBe(0);
  });

  it('ends the rocket trip when the last touched cell begins shrinking', () => {
    expect(getLineRocketTravelEndMs(450, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(450);
    expect(getLineRocketFadeStartMs(450, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(
      450 + SPECIAL_WIPE_PRE_SHRINK_MS,
    );
  });

  it('starts LineRocket cell shrink early enough for vfx to meet the rocket', () => {
    expect(LINE_ROCKET_CLEAR_LEAD_MS).toBe(240);
    expect(getLineRocketClearDelayMs(0, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(0);
    expect(getLineRocketClearDelayMs(90, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(0);
    expect(getLineRocketClearDelayMs(180, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(0);
    expect(getLineRocketClearDelayMs(270, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(30);
    expect(getLineRocketClearDelayMs(450, SPECIAL_WIPE_PRE_SHRINK_MS)).toBe(210);
  });

  it('starts FruityCross cell clears as soon as the group lands and the split begins', () => {
    expect(FRUITY_CROSS_GROUP_DROP_MS).toBe(344);
    expect(FRUITY_CROSS_SPLIT_LAUNCH_MS).toBe(60);
    expect(getFruityCrossClearDelayMs(0)).toBe(404);
    expect(getFruityCrossClearDelayMs(90)).toBe(494);
    expect(getFruityCrossClearDelayMs(180)).toBe(584);
    expect(getFruityCrossClearDelayMs(270)).toBe(674);
    expect(getFruityCrossClearDelayMs(360)).toBe(764);
    expect(getFruityCrossClearDelayMs(450)).toBe(854);
  });

  it('starts the FruityCross split when the first affected fruit begins shrinking', () => {
    expect(getFruityCrossSplitStartMs()).toBe(getFruityCrossClearDelayMs(0));
  });

  it('keeps the FruityCross arm travel running until the farthest affected fruit begins shrinking', () => {
    expect(getFruityCrossTravelEndMs(0)).toBe(getFruityCrossClearDelayMs(0));
    expect(getFruityCrossTravelEndMs(450)).toBe(getFruityCrossClearDelayMs(450));
  });
});
