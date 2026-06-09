import { describe, expect, it } from 'vitest';

import { isBoardInteractionLocked } from '../../src/gameplay/interaction';

describe('gameplay interaction locks', () => {
  it('keeps the board locked until all swap and match resolution visuals finish', () => {
    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: true,
        hasDropAnimation: false,
        hasSpecialMergeAnimation: false,
        hasSpecialWipeAnimation: false,
        hasPendingResolvedState: false,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: false,
        hasSpecialMergeAnimation: false,
        hasSpecialWipeAnimation: false,
        hasPendingResolvedState: true,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: true,
        hasSpecialMergeAnimation: false,
        hasSpecialWipeAnimation: false,
        hasPendingResolvedState: false,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: false,
        hasSpecialMergeAnimation: true,
        hasSpecialWipeAnimation: false,
        hasPendingResolvedState: false,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: false,
        hasSpecialMergeAnimation: false,
        hasSpecialWipeAnimation: true,
        hasPendingResolvedState: false,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: false,
        hasSpecialMergeAnimation: false,
        hasSpecialWipeAnimation: false,
        hasPendingResolvedState: false,
      }),
    ).toBe(false);
  });
});
