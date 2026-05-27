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
        hasPendingResolvedState: false,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: false,
        hasPendingResolvedState: true,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: true,
        hasPendingResolvedState: false,
      }),
    ).toBe(true);

    expect(
      isBoardInteractionLocked({
        paused: false,
        hasPendingSwap: false,
        hasMatchSplash: false,
        hasDropAnimation: false,
        hasPendingResolvedState: false,
      }),
    ).toBe(false);
  });
});
