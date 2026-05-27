import { getPlayableLevelId, isLevelUnlocked, type ProgressState } from '@/state/progress-helpers';

type ResultsRouteModelInput = {
  levelIdParam: string | string[] | undefined;
  won: boolean;
  progress: ProgressState;
  levelIds: readonly number[];
};

type ResultsRouteModel = {
  displayLevelId: number;
  primaryLabel: 'Next level' | 'Retry' | 'Level map';
  primaryRoute: `/level/${number}` | '/map';
};

function parseLevelIdParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue ?? 1);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function getResultsRouteModel({
  levelIdParam,
  won,
  progress,
  levelIds,
}: ResultsRouteModelInput): ResultsRouteModel {
  const availableLevelIds = [...levelIds].sort((left, right) => left - right);
  const requestedLevelId = parseLevelIdParam(levelIdParam);
  const levelExists = availableLevelIds.includes(requestedLevelId);
  const displayLevelId = levelExists ? requestedLevelId : getPlayableLevelId(progress, requestedLevelId, availableLevelIds);

  if (!levelExists) {
    return {
      displayLevelId,
      primaryLabel: 'Level map',
      primaryRoute: '/map',
    };
  }

  if (!won) {
    if (!isLevelUnlocked(progress, requestedLevelId)) {
      return {
        displayLevelId,
        primaryLabel: 'Level map',
        primaryRoute: '/map',
      };
    }

    return {
      displayLevelId,
      primaryLabel: 'Retry',
      primaryRoute: `/level/${requestedLevelId}`,
    };
  }

  const nextLevelId = requestedLevelId + 1;
  const nextLevelExists = availableLevelIds.includes(nextLevelId);
  const nextLevelUnlocked = isLevelUnlocked(progress, nextLevelId);

  if (!nextLevelExists || !nextLevelUnlocked) {
    return {
      displayLevelId,
      primaryLabel: 'Level map',
      primaryRoute: '/map',
    };
  }

  return {
    displayLevelId,
    primaryLabel: 'Next level',
    primaryRoute: `/level/${nextLevelId}`,
  };
}
