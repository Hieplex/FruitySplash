type BoardInteractionLockState = {
  paused: boolean;
  hasPendingSwap: boolean;
  hasMatchSplash: boolean;
  hasDropAnimation: boolean;
  hasSpecialMergeAnimation: boolean;
  hasSpecialWipeAnimation: boolean;
  hasPendingResolvedState: boolean;
};

export function isBoardInteractionLocked({
  paused,
  hasPendingSwap,
  hasMatchSplash,
  hasDropAnimation,
  hasSpecialMergeAnimation,
  hasSpecialWipeAnimation,
  hasPendingResolvedState,
}: BoardInteractionLockState) {
  return (
    paused ||
    hasPendingSwap ||
    hasMatchSplash ||
    hasDropAnimation ||
    hasSpecialMergeAnimation ||
    hasSpecialWipeAnimation ||
    hasPendingResolvedState
  );
}
