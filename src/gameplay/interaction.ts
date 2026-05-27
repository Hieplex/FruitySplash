type BoardInteractionLockState = {
  paused: boolean;
  hasPendingSwap: boolean;
  hasMatchSplash: boolean;
  hasDropAnimation: boolean;
  hasPendingResolvedState: boolean;
};

export function isBoardInteractionLocked({
  paused,
  hasPendingSwap,
  hasMatchSplash,
  hasDropAnimation,
  hasPendingResolvedState,
}: BoardInteractionLockState) {
  return paused || hasPendingSwap || hasMatchSplash || hasDropAnimation || hasPendingResolvedState;
}
