import { useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Modal, Pressable, Text, View, unstable_batchedUpdates, useWindowDimensions } from 'react-native';
import { AnimatedButton } from '@/components/animated-button';
import type { BombDropAnimation } from '@/components/bomb-effect-cell';
import type { HammerAnimation } from '@/components/hammer-effect-cell';
import { GameBoard, type DropAnimation, type ReshuffleAnimation } from '@/components/game-board';
import type { MatchSplash } from '@/components/match-splash-overlay';
import { ScoreReelDigits } from '@/components/score-reel-digits';
import type { SpecialMergeAnimation, SpecialWipeAnimation } from '@/components/special-cell-layer';
import { resolveSwap, type ResolveSwapResult } from '@/game/engine';
import {
  backgroundRuntimeAssets,
  barRuntimeAssets,
  scoreNumberSpriteAsset,
  soundRuntimeAssets,
  uiRuntimeAssets,
} from '@/game/assets/runtime-assets';
import { warmGameplayAssets } from '@/game/assets/preload-assets.native';
import { LEVELS } from '@/game/levels/levels';
import { createSeededRefill } from '@/game/gravity';
import { cloneBoard, cloneCell, createBoard, isAdjacent } from '@/game/board';
import { getBombBlastCells } from '@/game/boosters/bomb';
import { findRecommendedMove, type RecommendedMove } from '@/game/move-hints';
import type { Board, BoardCell, CascadeTimelineEvent, EngineState, Position, RowClearTravelDirection } from '@/game/types';
import { isBoardInteractionLocked } from '@/gameplay/interaction';
import { calculateLevelLayout } from '@/gameplay/level-layout';
import {
  FRUITY_CROSS_GROUP_DROP_MS,
  getLineRocketClearDelayMs,
  getFruityCrossClearDelayMs,
  getMatchSoundDelayMs,
  getSpecialWipeDelayMs,
  getSpecialWipeMaxDelayMs,
  SPECIAL_WIPE_PRE_SHRINK_MS,
  SPECIAL_WIPE_SPLASH_DURATION_MS,
} from '@/gameplay/match-vfx-timing';
import {
  createCascadeSequenceJobsFromTimeline,
  resolveBombClearSequence,
  resolveDirectSpecialPowerSequence,
  resolveHammerClearSequence,
  type CascadeSequenceJob,
  type ResolvedState,
} from '@/gameplay/match-cascade';
import {
  DIRECT_SPECIAL_POWER_TOOL_IDS,
  getDirectSpecialPowerKind,
  getLineRocketCellDelayMs,
  type DirectSpecialPowerTool,
} from '@/gameplay/direct-power-tools';
import { getPlayableLevelId, useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const gameplaySettingsButtonImage = require('../../assets/fruity/Buttons/SettingScreen/SettingButton.png');
const gameplaySettingsScreenImage = require('../../assets/fruity/Buttons/SettingScreen/ScreenSetting.png');
const gameplaySettingsExitImage = require('../../assets/fruity/Buttons/SettingScreen/Exit.png');

function calculateStars(score: number, star1: number, star2: number, star3: number) {
  if (score >= star3) return 3;
  if (score >= star2) return 2;
  if (score >= star1) return 1;
  return 0;
}

function createLevelState(seed: number): EngineState {
  const board = createBoard({ seed });
  return {
    board,
    score: 0,
    movesUsed: 0,
  };
}

const TIMER_ENABLED = false;
const MAX_MOVES = 30;
const MOVE_HINT_IDLE_DELAY_MS = 5000;
const DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE = true;

function getSpecialWipePreShrinkMs(sourceTool?: 'lineRocket' | 'fruityCross') {
  return sourceTool === 'fruityCross' ? SPECIAL_WIPE_PRE_SHRINK_MS : SPECIAL_WIPE_PRE_SHRINK_MS;
}
const DEBUG_SHOW_BOARD_TOUCH_BOUNDS = true;

type BoardToolId = 'bomb' | 'hammer' | DirectSpecialPowerTool;

function isDirectSpecialPowerTool(tool: BoardToolId): tool is DirectSpecialPowerTool {
  return (DIRECT_SPECIAL_POWER_TOOL_IDS as readonly string[]).includes(tool);
}

function getTwoDigitMoves(moves: number) {
  return String(Math.max(0, Math.min(99, moves))).padStart(2, '0').split('').map(Number);
}

function getScoreDigits(score: number, digitCount: number) {
  return String(Math.max(0, Math.min(99999, score))).padStart(digitCount, '0').split('').map(Number);
}

type PendingSwapState = {
  key: number;
  from: Position;
  to: Position;
  fromCell: BoardCell;
  toCell: BoardCell;
  accepted: boolean;
  result: ResolveSwapResult;
  timelineJobs: CascadeSequenceJob[];
};

function toEngineState(state: ResolvedState): EngineState {
  return {
    board: state.board,
    score: state.score,
    movesUsed: state.movesUsed,
  };
}

type ActiveTimelineState = {
  activeJobIndex: number;
  jobs: CascadeSequenceJob[];
  state: ResolvedState;
  completedPrimary: boolean;
  completedOverlappedDrop: boolean;
};

function createCellSplashFromBoard(
  key: number,
  board: Board,
  cells: Position[],
  origin?: Position,
  options: {
    sourceTool?: 'lineRocket' | 'fruityCross';
    rowTravelDirection?: RowClearTravelDirection;
  } = {},
): MatchSplash {
  const columnCount = board[0]?.length ?? 0;
  const preShrinkMs = origin ? getSpecialWipePreShrinkMs(options.sourceTool) : undefined;

  return {
    key,
    chain: 1,
    durationMs: origin ? SPECIAL_WIPE_SPLASH_DURATION_MS : undefined,
    preShrinkMs,
    cells: cells
      .map((cell) => {
        const source = board[cell.row]?.[cell.col];
        if (!source) {
          return null;
        }

        return {
          row: cell.row,
          col: cell.col,
          fruit: source.fruit,
          delayMs:
            origin && options.sourceTool === 'lineRocket' && options.rowTravelDirection
              ? getLineRocketClearDelayMs(
                  getLineRocketCellDelayMs(cell, columnCount, options.rowTravelDirection),
                  getSpecialWipePreShrinkMs(options.sourceTool),
                )
              : origin && options.sourceTool === 'fruityCross'
                ? getFruityCrossClearDelayMs(getSpecialWipeDelayMs(cell, origin))
              : origin
                ? getSpecialWipeDelayMs(cell, origin)
                : 0,
        };
      })
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null),
  };
}

export default function LevelScreen() {
  const screenWipe = useScreenWipe();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const requestedLevelId = Number(id ?? 1);
  const progress = useProgress();
  const levelIds = useMemo(() => LEVELS.map((entry) => entry.id), []);
  const levelId = progress.hydrated
    ? getPlayableLevelId(progress, requestedLevelId, levelIds)
    : levelIds.includes(requestedLevelId)
      ? requestedLevelId
      : LEVELS[0].id;
  const level = useMemo(() => LEVELS.find((entry) => entry.id === levelId) ?? LEVELS[0], [levelId]);
  const matchSoundPlayer = useAudioPlayer(soundRuntimeAssets.matchEffect, {
    keepAudioSessionActive: true,
  });
  const matchSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directPowerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directPowerStartTimes = useRef(new Map<number, number>());
  const completedLevelRef = useRef<number | null>(null);
  const [engineState, setEngineState] = useState<EngineState>(() => createLevelState(level.seed));
  const [selected, setSelected] = useState<Position | null>(null);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSeconds);
  const [pendingSwap, setPendingSwap] = useState<PendingSwapState | null>(null);
  const [matchSplash, setMatchSplash] = useState<MatchSplash | null>(null);
  const [matchDisplayBoard, setMatchDisplayBoard] = useState<Board | null>(null);
  const [dropAnimation, setDropAnimation] = useState<DropAnimation | null>(null);
  const [reshuffleAnimation, setReshuffleAnimation] = useState<ReshuffleAnimation | null>(null);
  const [specialMergeAnimation, setSpecialMergeAnimation] = useState<SpecialMergeAnimation | null>(null);
  const [specialWipeAnimation, setSpecialWipeAnimation] = useState<SpecialWipeAnimation | null>(null);
  const [selectedBoardTool, setSelectedBoardTool] = useState<BoardToolId | null>(null);
  const [bombDropAnimation, setBombDropAnimation] = useState<BombDropAnimation | null>(null);
  const [pendingBombClear, setPendingBombClear] = useState<{ key: number; target: Position; board: Board } | null>(
    null,
  );
  const [hammerAnimation, setHammerAnimation] = useState<HammerAnimation | null>(null);
  const [pendingHammerClear, setPendingHammerClear] = useState<{ key: number; target: Position; board: Board } | null>(
    null,
  );
  const [recommendedMove, setRecommendedMove] = useState<RecommendedMove | null>(null);
  const [activeTimeline, setActiveTimeline] = useState<ActiveTimelineState | null>(null);
  const activeTimelineCompletion = useRef<{
    activeJobIndex: number;
    completedPrimary: boolean;
    completedOverlappedDrop: boolean;
  } | null>(null);
  const [showBoosterRow, setShowBoosterRow] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const settingsExitScale = useRef(new Animated.Value(1)).current;
  const settingsHomeScale = useRef(new Animated.Value(1)).current;
  const settingsMapScale = useRef(new Animated.Value(1)).current;
  const levelLayout = calculateLevelLayout({
    screenWidth,
    screenHeight,
    rows: level.rows,
    cols: level.cols,
  });
  const { boosters, grid, hud, settingsButton, settingsOverlay } = levelLayout;
  const canUseBombBooster = DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE || progress.inventory.boosters.bomb > 0;
  const canUseHammerBooster = DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE || progress.inventory.boosters.hammer > 0;
  const moveDigits = getTwoDigitMoves(MAX_MOVES - engineState.movesUsed);
  const scoreDigits = getScoreDigits(engineState.score, hud.scoreValue.digits);
  const scoreProgress = Math.max(0, Math.min(1, engineState.score / level.targetScore));
  const progressFillWidth =
    scoreProgress <= 0
      ? hud.progressFill.minWidth
      : hud.progressFill.minWidth + (hud.progressFill.maxWidth - hud.progressFill.minWidth) * scoreProgress;
  const getProgressCheckpointX = (threshold: number) =>
    hud.progressFill.left +
    hud.progressFill.minWidth +
    (hud.progressFill.maxWidth - hud.progressFill.minWidth) * threshold;
  const boardInteractionLocked = isBoardInteractionLocked({
    paused,
    hasPendingSwap: Boolean(pendingSwap),
    hasMatchSplash: Boolean(matchSplash),
    hasDropAnimation: Boolean(dropAnimation),
    hasSpecialMergeAnimation: Boolean(specialMergeAnimation),
    hasSpecialWipeAnimation: Boolean(specialWipeAnimation),
    hasPendingResolvedState:
      Boolean(activeTimeline) ||
      Boolean(reshuffleAnimation) ||
      Boolean(bombDropAnimation) ||
      Boolean(pendingBombClear) ||
      Boolean(hammerAnimation) ||
      Boolean(pendingHammerClear),
  });

  function clearPendingMatchSound() {
    if (matchSoundTimer.current === null) {
      return;
    }

    clearTimeout(matchSoundTimer.current);
    matchSoundTimer.current = null;
  }

  function clearPendingDirectPower() {
    if (directPowerTimer.current === null) {
      return;
    }

    clearTimeout(directPowerTimer.current);
    directPowerTimer.current = null;
  }

  function playMatchSound(delayMs = 0) {
    clearPendingMatchSound();

    if (!progress.soundEnabled) {
      return;
    }

    const play = () => {
      matchSoundTimer.current = null;
      void matchSoundPlayer.seekTo(0).finally(() => matchSoundPlayer.play());
    };

    if (delayMs <= 0) {
      play();
      return;
    }

    matchSoundTimer.current = setTimeout(play, delayMs);
  }

  function animateSettingsExit(value: number) {
    Animated.spring(settingsExitScale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  function animateSettingsMenu(scale: Animated.Value, value: number) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  useEffect(() => {
    if (!progress.hydrated || requestedLevelId === levelId) {
      return;
    }

    screenWipe.replace(`/level/${levelId}`);
  }, [levelId, progress.hydrated, requestedLevelId, screenWipe]);

  useEffect(() => {
    void warmGameplayAssets();
    const timer = setTimeout(() => setShowBoosterRow(true), 140);

    return () => {
      clearTimeout(timer);
      clearPendingMatchSound();
      clearPendingDirectPower();
    };
  }, []);

  useEffect(() => {
    if (!showBoosterRow) {
      return;
    }

    screenWipe.setScreenReady();
  }, [screenWipe, showBoosterRow]);

  useEffect(() => {
    completedLevelRef.current = null;
    clearPendingMatchSound();
    clearPendingDirectPower();
    directPowerStartTimes.current.clear();
    setEngineState(createLevelState(level.seed));
    setSelected(null);
    setPaused(false);
    setTimeLeft(level.timeLimitSeconds);
    setPendingSwap(null);
    setMatchSplash(null);
    setMatchDisplayBoard(null);
    setDropAnimation(null);
    setReshuffleAnimation(null);
    setSpecialMergeAnimation(null);
    setSpecialWipeAnimation(null);
    setSelectedBoardTool(null);
    setBombDropAnimation(null);
    setPendingBombClear(null);
    setHammerAnimation(null);
    setPendingHammerClear(null);
    setRecommendedMove(null);
    setActiveTimeline(null);
    activeTimelineCompletion.current = null;
    setShowBoosterRow(false);
    setShowSettingsOverlay(false);

    const timer = setTimeout(() => setShowBoosterRow(true), 140);
    return () => clearTimeout(timer);
  }, [level.id, level.seed, level.timeLimitSeconds]);

  useEffect(() => {
    setRecommendedMove(null);
    if (paused || boardInteractionLocked || selected) {
      return;
    }

    const timeout = setTimeout(() => {
      setRecommendedMove(findRecommendedMove(engineState.board));
    }, MOVE_HINT_IDLE_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [boardInteractionLocked, engineState.board, paused, selected]);

  useEffect(() => {
    if (!TIMER_ENABLED) return;
    if (paused) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [paused, timeLeft]);

  function commitResolvedState(state: ResolvedState) {
    activeTimelineCompletion.current = null;
    unstable_batchedUpdates(() => {
      setMatchSplash(null);
      setDropAnimation(null);
      setReshuffleAnimation(null);
      setSpecialMergeAnimation(null);
      setSpecialWipeAnimation(null);
      setEngineState(toEngineState(state));
      setActiveTimeline(null);
      setMatchDisplayBoard(null);
    });
  }

  function getOverlappedDrop(job?: CascadeSequenceJob) {
    if (!job || !('overlappedDrop' in job)) {
      return undefined;
    }

    return job.overlappedDrop;
  }

  function hasOverlappedDrop(job?: CascadeSequenceJob) {
    const overlappedDrop = getOverlappedDrop(job);
    return Boolean(overlappedDrop && overlappedDrop.motions.length > 0);
  }

  function applyTimelineJob(job: CascadeSequenceJob) {
    if (job.type === 'splash') {
      const overlappedDrop = job.overlappedDrop;
      unstable_batchedUpdates(() => {
        setMatchDisplayBoard(overlappedDrop?.board ?? job.board);
        setDropAnimation(
          overlappedDrop
            ? {
                key: overlappedDrop.key,
                motions: overlappedDrop.motions,
                hiddenCells: overlappedDrop.hiddenCells,
                startDelaysByColumn: overlappedDrop.startDelaysByColumn,
              }
            : null,
        );
        setReshuffleAnimation(null);
        setSpecialMergeAnimation(null);
        setSpecialWipeAnimation(null);
        setMatchSplash(job.splash);
      });
      playMatchSound(getMatchSoundDelayMs(job.splash));
      return;
    }

    if (job.type === 'drop') {
      unstable_batchedUpdates(() => {
        setMatchSplash(null);
        setReshuffleAnimation(null);
        setSpecialMergeAnimation(null);
        setSpecialWipeAnimation(null);
        setMatchDisplayBoard(job.board);
        setDropAnimation({
          key: job.key,
          motions: job.motions,
          hiddenCells: job.hiddenCells,
          startDelaysByColumn: job.startDelaysByColumn,
        });
      });
      return;
    }

    if (job.type === 'special-merge') {
      unstable_batchedUpdates(() => {
        setDropAnimation(null);
        setReshuffleAnimation(null);
        setSpecialWipeAnimation(null);
        setMatchDisplayBoard(job.board);
        setMatchSplash(job.companionSplash ?? null);
        setSpecialMergeAnimation({
          key: job.key,
          board: job.board,
          fruit: job.fruit,
          sourceCells: job.sourceCells,
          hiddenCells: job.hiddenCells,
          targetCell: job.targetCell,
          special: job.special,
        });
      });
      return;
    }

    if (job.type === 'special-wipe') {
      const columnCount = job.board[0]?.length ?? 0;
      const lineRocketDirection = job.sourceTool === 'lineRocket' ? job.rowTravelDirection : undefined;
      const maxDelayMs =
        lineRocketDirection
          ? job.cells.reduce(
              (maxDelay, cell) =>
                Math.max(
                  maxDelay,
                  getLineRocketClearDelayMs(
                    getLineRocketCellDelayMs(cell, columnCount, lineRocketDirection),
                    getSpecialWipePreShrinkMs(job.sourceTool),
                  ),
                ),
              0,
            )
          : job.sourceTool === 'fruityCross'
            ? getFruityCrossClearDelayMs(getSpecialWipeMaxDelayMs(job.cells, job.origin))
            : getSpecialWipeMaxDelayMs(job.cells, job.origin);
      const preDelayMs = getSpecialWipePreShrinkMs(job.sourceTool);
      const splash =
        job.sourceTool === 'fruityCross'
          ? null
          : createCellSplashFromBoard(job.key, job.board, job.cells, job.origin, {
              sourceTool: job.sourceTool,
              rowTravelDirection: job.rowTravelDirection,
            });
      unstable_batchedUpdates(() => {
        setDropAnimation(null);
        setReshuffleAnimation(null);
        setSpecialMergeAnimation(null);
        setMatchDisplayBoard(job.board);
        setMatchSplash(splash);
        setSpecialWipeAnimation({
          key: job.key,
          board: job.board,
          origin: job.origin,
          kind: job.kind,
          cells: job.cells,
          targetFruit: job.targetFruit,
          sourceTool: job.sourceTool,
          rowTravelDirection: job.rowTravelDirection,
          preDelayMs,
          durationMs:
            job.sourceTool === 'fruityCross'
              ? Math.max(1, maxDelayMs - FRUITY_CROSS_GROUP_DROP_MS) + preDelayMs + SPECIAL_WIPE_SPLASH_DURATION_MS
              : maxDelayMs + preDelayMs + SPECIAL_WIPE_SPLASH_DURATION_MS,
          groupDropCompleted: job.sourceTool === 'fruityCross',
        });
      });
      playMatchSound(getMatchSoundDelayMs(splash));
      return;
    }

    if (job.type === 'reshuffle') {
      unstable_batchedUpdates(() => {
        setMatchSplash(null);
        setDropAnimation(null);
        setSpecialMergeAnimation(null);
        setSpecialWipeAnimation(null);
        setMatchDisplayBoard(job.before);
        setReshuffleAnimation({
          key: job.key,
          board: job.after,
        });
      });
    }
  }

  function getNextRenderableJobIndex(jobs: CascadeSequenceJob[], startIndex: number) {
    for (let index = startIndex; index < jobs.length; index += 1) {
      const job = jobs[index];
      if (
        job &&
        (job.type === 'splash' ||
          job.type === 'drop' ||
          job.type === 'special-merge' ||
          job.type === 'special-wipe' ||
          job.type === 'reshuffle')
      ) {
        return index;
      }
    }

    return -1;
  }

  function startTimeline(jobs: CascadeSequenceJob[], state: ResolvedState) {
    const firstJobIndex = getNextRenderableJobIndex(jobs, 0);
    if (firstJobIndex === -1) {
      commitResolvedState(state);
      return;
    }

    applyTimelineJob(jobs[firstJobIndex]);
    activeTimelineCompletion.current = {
      activeJobIndex: firstJobIndex,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(jobs[firstJobIndex]),
    };
    setActiveTimeline({
      activeJobIndex: firstJobIndex,
      jobs,
      state,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(jobs[firstJobIndex]),
    });
  }

  function advanceToNextTimelineJob(timeline: ActiveTimelineState) {
    const nextJobIndex = getNextRenderableJobIndex(
      timeline.jobs,
      timeline.activeJobIndex + 1,
    );
    const nextJob = nextJobIndex === -1 ? undefined : timeline.jobs[nextJobIndex];

    if (!nextJob) {
      activeTimelineCompletion.current = null;
      commitResolvedState(timeline.state);
      return true;
    }

    applyTimelineJob(nextJob);
    activeTimelineCompletion.current = {
      activeJobIndex: nextJobIndex,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(nextJob),
    };
    setActiveTimeline({
      activeJobIndex: nextJobIndex,
      jobs: timeline.jobs,
      state: timeline.state,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(nextJob),
    });
    return true;
  }

  function advanceTimeline(jobType: CascadeSequenceJob['type'], key: number) {
    if (!activeTimeline) {
      return false;
    }

    const activeJob = activeTimeline.jobs[activeTimeline.activeJobIndex];
    if (!activeJob || activeJob.type !== jobType || activeJob.key !== key) {
      return false;
    }

    const completion = activeTimelineCompletion.current;
    const completedOverlappedDrop =
      completion && completion.activeJobIndex === activeTimeline.activeJobIndex
        ? completion.completedOverlappedDrop
        : activeTimeline.completedOverlappedDrop;

    if (hasOverlappedDrop(activeJob) && !completedOverlappedDrop) {
      activeTimelineCompletion.current = {
        activeJobIndex: activeTimeline.activeJobIndex,
        completedPrimary: true,
        completedOverlappedDrop,
      };
      setActiveTimeline((current) =>
        current && current.activeJobIndex === activeTimeline.activeJobIndex
          ? {
              ...current,
              completedPrimary: true,
            }
          : current,
      );
      return true;
    }

    return advanceToNextTimelineJob(activeTimeline);
  }

  function completeOverlappedDrop(key: number) {
    if (!activeTimeline) {
      return false;
    }

    const activeJob = activeTimeline.jobs[activeTimeline.activeJobIndex];
    const overlappedDrop = getOverlappedDrop(activeJob);
    if (!overlappedDrop || overlappedDrop.key !== key) {
      return false;
    }

    const completion = activeTimelineCompletion.current;
    const completedPrimary =
      completion && completion.activeJobIndex === activeTimeline.activeJobIndex
        ? completion.completedPrimary
        : activeTimeline.completedPrimary;

    if (completedPrimary) {
      return advanceToNextTimelineJob(activeTimeline);
    }

    activeTimelineCompletion.current = {
      activeJobIndex: activeTimeline.activeJobIndex,
      completedPrimary,
      completedOverlappedDrop: true,
    };
    setActiveTimeline((current) =>
      current && current.activeJobIndex === activeTimeline.activeJobIndex
        ? {
            ...current,
            completedOverlappedDrop: true,
          }
        : current,
    );
    return true;
  }

  useEffect(() => {
    const stars = calculateStars(engineState.score, level.star1, level.star2, level.star3);
    if (engineState.score >= level.targetScore) {
      if (completedLevelRef.current === level.id) {
        return;
      }

      completedLevelRef.current = level.id;
      progress.completeLevel(level.id, engineState.score, stars);
      screenWipe.replace({
        pathname: '/results',
        params: {
          levelId: String(level.id),
          score: String(engineState.score),
          stars: String(stars),
          won: '1',
        },
      });
    }
  }, [engineState.score, level, progress, screenWipe]);

  useEffect(() => {
    if (!TIMER_ENABLED) return;
    if (timeLeft > 0) return;

    const stars = calculateStars(engineState.score, level.star1, level.star2, level.star3);
    screenWipe.replace({
      pathname: '/results',
      params: {
        levelId: String(level.id),
        score: String(engineState.score),
        stars: String(stars),
        won: '0',
      },
    });
  }, [engineState.score, level, screenWipe, timeLeft]);

  function beginSwap(from: Position, to: Position) {
    const timelineEvents: CascadeTimelineEvent[] = [];
    const refillSeed = level.seed + engineState.movesUsed * 101 + from.row * 17 + from.col * 31 + to.row * 43 + to.col * 59;
    const result = resolveSwap(
      engineState,
      { from, to },
      {
        refill: createSeededRefill({ seed: refillSeed, fruitTypes: level.fruitTypes }),
        onTimelineEvent: (event) => timelineEvents.push(event),
        reshuffle: (board: Board) => createBoard({ seed: level.seed + engineState.movesUsed + 99 }),
      },
    );
    const swapKey = Date.now();
    const timelineJobs = result.accepted ? createCascadeSequenceJobsFromTimeline(timelineEvents) : [];

    setPendingSwap({
      key: swapKey,
      from,
      to,
      fromCell: cloneCell(engineState.board[from.row][from.col]),
      toCell: cloneCell(engineState.board[to.row][to.col]),
      accepted: result.accepted,
      result,
      timelineJobs,
    });
    setSelected(null);
  }

  function activateDirectSpecialPower(tool: DirectSpecialPowerTool, target: Position) {
    const key = Date.now();
    const boardSnapshot = engineState.board;
    const stateSnapshot = engineState;
    clearPendingDirectPower();
    unstable_batchedUpdates(() => {
      setSelectedBoardTool(null);
      setSelected(null);
      setRecommendedMove(null);
      setDropAnimation(null);
      setReshuffleAnimation(null);
      setSpecialMergeAnimation(null);
      setSpecialWipeAnimation(null);
      setActiveTimeline(null);
      activeTimelineCompletion.current = null;
    });

    if (tool === 'fruityCross') {
      setSpecialWipeAnimation({
        key: key - 1,
        board: boardSnapshot,
        origin: target,
        kind: 'cross-wipe',
        cells: [target],
        sourceTool: 'fruityCross',
        preDelayMs: 0,
        durationMs: FRUITY_CROSS_GROUP_DROP_MS,
        previewOnly: true,
      });
    }

    directPowerTimer.current = setTimeout(() => {
      directPowerTimer.current = null;
      const refillSeed = level.seed + stateSnapshot.movesUsed * 101 + target.row * 29 + target.col * 47 + key;
      const cascadeRefillSeed = level.seed + stateSnapshot.movesUsed * 101 + target.row * 31 + target.col * 53 + key + 512;
      const sequence = resolveDirectSpecialPowerSequence({
        key,
        target,
        tool,
        kind: getDirectSpecialPowerKind(tool),
        board: boardSnapshot,
        engineState: stateSnapshot,
        refill: createSeededRefill({ seed: refillSeed, fruitTypes: level.fruitTypes }),
        cascadeRefill: createSeededRefill({ seed: cascadeRefillSeed, fruitTypes: level.fruitTypes }),
        reshuffle: (board: Board) => createBoard({ seed: level.seed + stateSnapshot.movesUsed + 499 }),
      });

      startTimeline(sequence.jobs, sequence.state);
    }, tool === 'fruityCross' ? FRUITY_CROSS_GROUP_DROP_MS : 0);
  }

  function handleSelect(position: Position) {
    if (boardInteractionLocked) {
      return;
    }
    setRecommendedMove(null);

    if (selectedBoardTool === 'bomb') {
      if (!canUseBombBooster) {
        setSelectedBoardTool(null);
        setSelected(null);
        return;
      }

      const key = Date.now();
      const blastCells = getBombBlastCells(position, engineState.board);
      if (!DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE) {
        progress.consumeBooster('bomb');
      }
      setBombDropAnimation({ key, target: position, blastCells });
      setPendingBombClear({ key, target: position, board: engineState.board });
      setSelectedBoardTool(null);
      setSelected(null);
      return;
    }

    if (selectedBoardTool === 'hammer') {
      if (!canUseHammerBooster) {
        setSelectedBoardTool(null);
        setSelected(null);
        return;
      }

      if (!DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE) {
        progress.consumeBooster('hammer');
      }
      setEngineState((current) => {
        const board = cloneBoard(current.board);
        const source = board[position.row]?.[position.col];
        if (!source) {
          return current;
        }

        board[position.row][position.col] = {
          type: 'special',
          fruit: source.fruit,
          kind: 'cross-wipe',
          powerTier: 5,
        };

        return {
          ...current,
          board,
        };
      });
      setSelectedBoardTool(null);
      setHammerAnimation(null);
      setPendingHammerClear(null);
      setSelected(null);
      return;
    }

    if (selectedBoardTool && isDirectSpecialPowerTool(selectedBoardTool)) {
      activateDirectSpecialPower(selectedBoardTool, position);
      return;
    }

    if (!selected) {
      setSelected(position);
      return;
    }

    if (selected.row === position.row && selected.col === position.col) {
      setSelected(null);
      return;
    }

    if (!isAdjacent(selected, position)) {
      setSelected(position);
      return;
    }

    beginSwap(selected, position);
  }

  function handleSwipe(from: Position, to: Position) {
    if (boardInteractionLocked) {
      return;
    }

    setSelectedBoardTool(null);
    setBombDropAnimation(null);
    setPendingBombClear(null);
    setHammerAnimation(null);
    setPendingHammerClear(null);
    setRecommendedMove(null);
    setSelected(null);
    beginSwap(from, to);
  }

  function handleSwapAnimationEnd() {
    if (!pendingSwap) {
      return;
    }

    if (pendingSwap.accepted) {
      if (pendingSwap.timelineJobs.length > 0) {
        const jobs = pendingSwap.timelineJobs;
        setPendingSwap((current) => (current?.key === pendingSwap.key ? null : current));
        startTimeline(jobs, pendingSwap.result);
        return;
      } else {
        commitResolvedState(pendingSwap.result);
      }
    }

    setPendingSwap(null);
  }

  function handleMatchSplashComplete(key: number) {
    if (!activeTimeline) {
      setMatchSplash((current) => (current?.key === key ? null : current));
      return;
    }
    const activeJob = activeTimeline.jobs[activeTimeline.activeJobIndex];
    if (activeJob?.type === 'special-merge' && activeJob.key === key) {
      setMatchSplash((current) => (current?.key === key ? null : current));
      return;
    }
    if (activeJob?.type === 'special-wipe' && activeJob.key === key) {
      setMatchSplash((current) => (current?.key === key ? null : current));
      return;
    }
    setMatchSplash((current) => (current?.key === key ? null : current));
    advanceTimeline('splash', key);
  }

  function handleDropAnimationComplete(key: number) {
    setDropAnimation((current) => (current?.key === key ? null : current));
    if (!activeTimeline) {
      return;
    }
    if (completeOverlappedDrop(key)) {
      return;
    }
    advanceTimeline('drop', key);
  }

  function handleReshuffleAnimationComplete(key: number) {
    if (!activeTimeline) {
      return;
    }
    advanceTimeline('reshuffle', key);
  }

  function handleSpecialMergeComplete(key: number) {
    if (!activeTimeline) {
      setSpecialMergeAnimation((current) => (current?.key === key ? null : current));
      return;
    }
    advanceTimeline('special-merge', key);
  }

  function handleSpecialWipeComplete(key: number) {
    setSpecialWipeAnimation((current) => (current?.key === key && !current.previewOnly ? null : current));
    if (!activeTimeline) {
      return;
    }
    advanceTimeline('special-wipe', key);
  }

  function resolveBombClear(key: number) {
    if (!pendingBombClear || pendingBombClear.key !== key) {
      setBombDropAnimation((current) => (current?.key === key ? null : current));
      return;
    }

    const refillSeed = level.seed + engineState.movesUsed * 101 + pendingBombClear.target.row * 17 + pendingBombClear.target.col * 31;
    const cascadeRefillSeed =
      level.seed + engineState.movesUsed * 101 + pendingBombClear.target.row * 19 + pendingBombClear.target.col * 37 + 256;
    const sequence = resolveBombClearSequence({
      key,
      target: pendingBombClear.target,
      board: pendingBombClear.board,
      engineState,
      refill: createSeededRefill({ seed: refillSeed, fruitTypes: level.fruitTypes }),
      cascadeRefill: createSeededRefill({ seed: cascadeRefillSeed, fruitTypes: level.fruitTypes }),
      reshuffle: (board: Board) => createBoard({ seed: level.seed + engineState.movesUsed + 299 }),
    });

    unstable_batchedUpdates(() => {
      setBombDropAnimation(null);
      setPendingBombClear(null);
      setActiveTimeline(null);
      activeTimelineCompletion.current = null;
    });
    startTimeline(
      sequence.jobs,
      sequence.state,
    );
    playMatchSound();
  }

  function resolveHammerClear(key: number) {
    if (!pendingHammerClear || pendingHammerClear.key !== key) {
      setHammerAnimation((current) => (current?.key === key ? null : current));
      return;
    }

    const refillSeed = level.seed + engineState.movesUsed * 101 + pendingHammerClear.target.row * 17 + pendingHammerClear.target.col * 31;
    const cascadeRefillSeed =
      level.seed + engineState.movesUsed * 101 + pendingHammerClear.target.row * 19 + pendingHammerClear.target.col * 37 + 256;
    const sequence = resolveHammerClearSequence({
      key,
      target: pendingHammerClear.target,
      board: pendingHammerClear.board,
      engineState,
      refill: createSeededRefill({ seed: refillSeed, fruitTypes: level.fruitTypes }),
      cascadeRefill: createSeededRefill({ seed: cascadeRefillSeed, fruitTypes: level.fruitTypes }),
      reshuffle: (board: Board) => createBoard({ seed: level.seed + engineState.movesUsed + 299 }),
    });

    unstable_batchedUpdates(() => {
      setHammerAnimation(null);
      setPendingHammerClear(null);
      setActiveTimeline(null);
      activeTimelineCompletion.current = null;
    });
    startTimeline(
      sequence.jobs,
      sequence.state,
    );
    playMatchSound();
  }

  const boardToolButtons: Array<{
    id: BoardToolId;
    label: string;
    source: number;
    disabled?: boolean;
  }> = [
    {
      id: 'bomb',
      label: 'Bomb booster',
      source: uiRuntimeAssets.gameplayBombButton,
      disabled: !canUseBombBooster,
    },
    {
      id: 'hammer',
      label: 'Hammer booster',
      source: uiRuntimeAssets.gameplayHammerButton,
      disabled: !canUseHammerBooster,
    },
    {
      id: 'lineRocket',
      label: 'LineRocket',
      source: uiRuntimeAssets.gameplayLineRocketButton,
    },
    {
      id: 'fruityCross',
      label: 'FruityCross',
      source: uiRuntimeAssets.gameplayFruityCrossButton,
    },
    {
      id: 'lightningFruits',
      label: 'LightningFruits',
      source: uiRuntimeAssets.gameplayLightningFruitsButton,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ImageBackground source={backgroundRuntimeAssets.gameplay} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
      <Pressable
        onPress={() => setShowSettingsOverlay(true)}
          style={({ pressed }) => ({
            position: 'absolute',
            top: settingsButton.top,
            right: settingsButton.right,
            width: settingsButton.size,
            height: settingsButton.size,
            zIndex: 5,
            opacity: pressed ? 0.82 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <Image
          source={gameplaySettingsButtonImage}
          fadeDuration={0}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: hud.top,
          left: hud.left,
          width: hud.width,
          height: hud.height,
          zIndex: 2,
        }}
      >
        <Image
          source={barRuntimeAssets.score}
          fadeDuration={0}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            top: hud.scoreBar.top,
            left: hud.scoreBar.left,
            width: hud.scoreBar.width,
            height: hud.scoreBar.height,
            zIndex: 1,
          }}
        />
        <Image
          source={barRuntimeAssets.progress}
          fadeDuration={0}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            top: hud.progressBar.top,
            left: hud.progressBar.left,
            width: hud.progressBar.width,
            height: hud.progressBar.height,
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: hud.progressFill.top,
            left: hud.progressFill.left,
            width: progressFillWidth,
            height: hud.progressFill.height,
            borderRadius: hud.progressFill.height / 2,
            overflow: 'hidden',
            zIndex: 3,
          }}
        >
          <Image
            source={barRuntimeAssets.progressFill}
            fadeDuration={0}
            resizeMode="stretch"
            style={{
              width: hud.progressFill.width,
              height: hud.progressFill.height,
            }}
          />
        </View>
        {hud.progressStars.thresholds.map((threshold) => (
          <Image
            key={threshold}
            source={scoreProgress >= threshold ? barRuntimeAssets.fullStar : barRuntimeAssets.emptyStar}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              top: hud.progressStars.top,
              left: getProgressCheckpointX(threshold) - hud.progressStars.size / 2,
              width: hud.progressStars.size,
              height: hud.progressStars.size,
              zIndex: 4,
            }}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            top: hud.scoreValue.top,
            left: hud.scoreValue.left,
            zIndex: 5,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <ScoreReelDigits
            digits={scoreDigits}
            digitHeight={hud.scoreValue.numberHeight}
            digitWidth={hud.scoreValue.numberWidth}
            digitGap={hud.scoreValue.numberGap}
            sprite={scoreNumberSpriteAsset}
            spriteDigits={hud.scoreValue.spriteDigits}
          />
        </View>
        <Image
          source={barRuntimeAssets.moves}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: hud.movesBar.top,
            left: hud.movesBar.left,
            width: hud.movesBar.size,
            height: hud.movesBar.size,
            zIndex: 5,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: hud.movesValue.top,
            left: hud.movesValue.left,
            zIndex: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {moveDigits.map((digit, index) => (
            <View
              key={index}
              style={{
                width: hud.movesValue.width,
                height: hud.movesValue.height,
                marginLeft: index === 0 ? 0 : hud.movesValue.gap,
                overflow: 'hidden',
              }}
            >
              <Image
                source={scoreNumberSpriteAsset}
                fadeDuration={0}
                resizeMode="stretch"
                style={{
                  width: hud.movesValue.width * hud.movesValue.spriteDigits,
                  height: hud.movesValue.height,
                  transform: [{ translateX: -digit * hud.movesValue.width }],
                }}
              />
            </View>
          ))}
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          top: grid.boardTop,
          left: 0,
          right: 0,
          padding: grid.screenPadding,
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        <View
          style={{
            gap: boosters.gap,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              borderRadius: 28,
              backgroundColor: colors.peachDeep,
              padding: grid.framePadding,
              shadowColor: colors.shadow,
              shadowOpacity: 0.2,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}
          >
            <View
              style={{
                width: '100%',
                borderRadius: 28,
                backgroundColor: colors.coralDeep,
                padding: grid.innerFramePadding,
              }}
            >
              <View
                style={{
                  width: '100%',
          borderRadius: 24,
                  backgroundColor: colors.coral,
                  padding: grid.cellAreaPadding,
                }}
              >
                <GameBoard
                  board={matchDisplayBoard ?? engineState.board}
                selected={selected}
                disabled={boardInteractionLocked}
                pendingSwap={pendingSwap}
                matchSplash={matchSplash}
                dropAnimation={dropAnimation}
                reshuffleAnimation={reshuffleAnimation}
                specialMergeAnimation={specialMergeAnimation}
                specialWipeAnimation={specialWipeAnimation}
                bombDropAnimation={bombDropAnimation}
                bombDropSource={uiRuntimeAssets.gameplayBombDrop}
                hammerAnimation={hammerAnimation}
                hammerSource={uiRuntimeAssets.gameplayHammerButton}
                hint={recommendedMove}
                  maxWidth={grid.boardMaxWidth}
                  horizontalMargin={grid.sideMargin}
                  tileGap={grid.tileGap}
                  boardPadding={grid.boardPadding}
                  fruitImageScale={grid.fruitImageScale}
                  showTouchBounds={DEBUG_SHOW_BOARD_TOUCH_BOUNDS}
                  onSelect={handleSelect}
                  onSwipe={handleSwipe}
                onSwapAnimationEnd={handleSwapAnimationEnd}
                onMatchSplashComplete={handleMatchSplashComplete}
                onDropAnimationComplete={handleDropAnimationComplete}
                onReshuffleAnimationComplete={handleReshuffleAnimationComplete}
                onSpecialMergeComplete={handleSpecialMergeComplete}
                onSpecialWipeComplete={handleSpecialWipeComplete}
                onBombDropAnimationComplete={resolveBombClear}
                onHammerAnimationComplete={resolveHammerClear}
              />
              </View>
            </View>
          </View>
          {showBoosterRow ? (
            <View
              style={{
                flexDirection: 'row',
                gap: boosters.gap,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {boardToolButtons.map((tool) => {
                const chosen = selectedBoardTool === tool.id;
                const disabled = tool.disabled ?? false;

                return (
                  <Pressable
                    key={tool.id}
                    accessibilityRole="button"
                    accessibilityLabel={tool.label}
                    onPress={() => {
                      if (boardInteractionLocked) {
                        return;
                      }
                      if (disabled) {
                        setSelectedBoardTool((current) => (current === tool.id ? null : current));
                        return;
                      }
                      setSelected(null);
                      setRecommendedMove(null);
                      setSelectedBoardTool((current) => (current === tool.id ? null : tool.id));
                    }}
                    style={({ pressed }) => ({
                      width: boosters.buttonSize,
                      height: boosters.buttonSize,
                      borderRadius: boosters.buttonSize / 2,
                      overflow: 'hidden',
                      borderWidth: chosen ? 4 : 0,
                      borderColor: 'rgba(255, 248, 135, 0.95)',
                      opacity: disabled ? 0.42 : pressed ? 0.86 : 1,
                      transform: [{ scale: pressed || chosen ? 0.94 : 1 }],
                    })}
                  >
                    <Image
                      source={tool.source}
                      fadeDuration={0}
                      resizeMode="contain"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
      </ImageBackground>

      <Modal animationType="fade" transparent visible={paused}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              borderRadius: spacing.radiusLg,
              backgroundColor: colors.white,
              padding: spacing.xl,
              gap: spacing.lg,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '900' }}>Paused</Text>
            <AnimatedButton label="Resume" onPress={() => setPaused(false)} />
            <AnimatedButton
              label="Restart level"
              kind="secondary"
              onPress={() => {
                setEngineState(createLevelState(level.seed));
                setSelected(null);
                setTimeLeft(level.timeLimitSeconds);
                setPaused(false);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={showSettingsOverlay}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              width: settingsOverlay.width,
              height: settingsOverlay.height,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Image
              source={gameplaySettingsScreenImage}
              fadeDuration={0}
              resizeMode="contain"
              style={{
                width: '100%',
                height: '100%',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: settingsOverlay.menuButtonGap,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go home"
                  onPress={() => {
                    setShowSettingsOverlay(false);
                    screenWipe.replace('/chapters');
                  }}
                  onPressIn={() => animateSettingsMenu(settingsHomeScale, 0.92)}
                  onPressOut={() => animateSettingsMenu(settingsHomeScale, 1)}
                  style={{
                    width: settingsOverlay.menuButtonWidth,
                    height: settingsOverlay.menuButtonHeight,
                  }}
                >
                  <Animated.Image
                    source={uiRuntimeAssets.gameplayHomeButton}
                    fadeDuration={0}
                    resizeMode="contain"
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: [{ scale: settingsHomeScale }],
                    }}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go to map"
                  onPress={() => {
                    setShowSettingsOverlay(false);
                    screenWipe.replace('/map');
                  }}
                  onPressIn={() => animateSettingsMenu(settingsMapScale, 0.92)}
                  onPressOut={() => animateSettingsMenu(settingsMapScale, 1)}
                  style={{
                    width: settingsOverlay.menuButtonWidth,
                    height: settingsOverlay.menuButtonHeight,
                  }}
                >
                  <Animated.Image
                    source={uiRuntimeAssets.gameplayMapButton}
                    fadeDuration={0}
                    resizeMode="contain"
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: [{ scale: settingsMapScale }],
                    }}
                  />
                </Pressable>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close settings"
              onPress={() => setShowSettingsOverlay(false)}
              onPressIn={() => animateSettingsExit(0.92)}
              onPressOut={() => animateSettingsExit(1)}
              style={{
                position: 'absolute',
                top: settingsOverlay.exitButtonTop,
                right: settingsOverlay.exitButtonRight,
                width: settingsOverlay.exitButtonSize,
                height: settingsOverlay.exitButtonSize,
                zIndex: 2,
              }}
            >
              <Animated.Image
                source={gameplaySettingsExitImage}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [{ scale: settingsExitScale }],
                }}
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
