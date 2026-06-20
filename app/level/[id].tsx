import { useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, Modal, Pressable, Text, View } from 'react-native';
import { AnimatedButton } from '@/components/animated-button';
import type { BombDropAnimation } from '@/components/bomb-effect-cell';
import type { HammerAnimation } from '@/components/hammer-effect-cell';
import { GameBoard, type DropAnimation, type ReshuffleAnimation } from '@/components/game-board';
import type { MatchSplash } from '@/components/match-splash-overlay';
import { ScoreReelDigits } from '@/components/score-reel-digits';
import { SettingsOverlay } from '@/components/settings-overlay';
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
import { cloneBoard, cloneCell, createBoard, getCellFruit, isAdjacent } from '@/game/board';
import { findRecommendedMove, type RecommendedMove } from '@/game/move-hints';
import type { Board, BoardCell, CascadeTimelineEvent, EngineState, Position, RowClearTravelDirection, SpecialWipeSourceTool } from '@/game/types';
import { isBoardInteractionLocked } from '@/gameplay/interaction';
import { calculateLevelLayout } from '@/gameplay/level-layout';
import {
  FRUITY_CROSS_GROUP_DROP_MS,
  FRUITY_CROSS_SPLIT_LAUNCH_MS,
  getLineRocketClearDelayMs,
  getFruityCrossClearDelayMs,
  getMatchSoundDelayMs,
  getSpecialWipeDelayMs,
  getSpecialWipeMaxDelayMs,
  BOMB_DROP_DURATION_MS,
  BOMB_IMPACT_DURATION_MS,
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
import { calculateLevelCoinReward, getPlayableLevelId, useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';
import { usePlaytestViewport } from '@/platform/playtest-viewport';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const gameplaySettingsButtonImage = require('../../assets/fruity/Buttons/SettingScreen/SettingButton.png');

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
const MOVE_HINT_IDLE_DELAY_MS = 5000;
const DEBUG_UNLIMITED_BOOSTERS = true;
const DEBUG_UNLIMITED_BOOSTER_COUNT = 999;
const MIN_REAL_LIGHTNING_WIPE_MS = 260;
const LIGHTNING_STRIKE_START_AT = 0.08;
const MAX_SOUND_OUTPUT_GAIN = 0.5;
const BOOSTER_COUNT_TEXT_SIZE = 20;
const BOOSTER_COUNT_OUTLINE_OFFSET = 1.5;
const BOOSTER_COUNT_BADGE_MIN_WIDTH = 34;
const BOOSTER_COUNT_BADGE_HEIGHT = 24;

function getSpecialWipePreShrinkMs(sourceTool?: SpecialWipeSourceTool) {
  return sourceTool === 'fruityCross' ? SPECIAL_WIPE_PRE_SHRINK_MS : SPECIAL_WIPE_PRE_SHRINK_MS;
}
const DEBUG_SHOW_BOARD_TOUCH_BOUNDS = false;

type BoardToolId = 'bomb' | 'hammer' | DirectSpecialPowerTool;
type VisibleBoardToolId = 'bomb' | DirectSpecialPowerTool;

function runStateUpdates(callback: () => void) {
  callback();
}

function isDirectSpecialPowerTool(tool: BoardToolId): tool is DirectSpecialPowerTool {
  return (DIRECT_SPECIAL_POWER_TOOL_IDS as readonly string[]).includes(tool);
}

function getTwoDigitMoves(moves: number) {
  return String(Math.max(0, Math.min(99, moves))).padStart(2, '0').split('').map(Number);
}

function getScoreDigits(score: number, digitCount: number) {
  return String(Math.max(0, Math.min(99999, score))).padStart(digitCount, '0').split('').map(Number);
}

function getBoosterInventoryId(tool: VisibleBoardToolId) {
  switch (tool) {
    case 'bomb':
      return 'bomb' as const;
    case 'lineRocket':
      return 'lineRocket' as const;
    case 'fruityCross':
      return 'fruityCross' as const;
    case 'lightningFruits':
      return 'lightningFruits' as const;
  }
}

function BoosterCountLabel({ count }: { count: number }) {
  const text = `x${Math.max(0, count)}`;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: -4,
        bottom: -2,
        minWidth: BOOSTER_COUNT_BADGE_MIN_WIDTH,
        height: BOOSTER_COUNT_BADGE_HEIGHT,
        paddingHorizontal: 6,
        borderRadius: BOOSTER_COUNT_BADGE_HEIGHT / 2,
        backgroundColor: 'rgba(31, 12, 9, 0.92)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 242, 200, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
      }}
    >
      {[
        [-BOOSTER_COUNT_OUTLINE_OFFSET, 0],
        [BOOSTER_COUNT_OUTLINE_OFFSET, 0],
        [0, -BOOSTER_COUNT_OUTLINE_OFFSET],
        [0, BOOSTER_COUNT_OUTLINE_OFFSET],
      ].map(([x, y], index) => (
        <Text
          key={`${text}-outline-${index}`}
          style={{
            position: 'absolute',
            color: '#120704',
            fontSize: BOOSTER_COUNT_TEXT_SIZE,
            lineHeight: BOOSTER_COUNT_TEXT_SIZE,
            fontWeight: '900',
            transform: [{ translateX: x }, { translateY: y }],
          }}
        >
          {text}
        </Text>
      ))}
      <Text
        style={{
          color: '#ffffff',
          fontSize: BOOSTER_COUNT_TEXT_SIZE,
          lineHeight: BOOSTER_COUNT_TEXT_SIZE,
          fontWeight: '900',
        }}
      >
        {text}
      </Text>
    </View>
  );
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
    sourceTool?: SpecialWipeSourceTool;
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

function createDropStartDelaysByColumnFromSplash(splash?: MatchSplash | null) {
  if (!splash) {
    return undefined;
  }

  const delaysByColumn: Record<number, number> = {};
  const preShrinkMs = splash.preShrinkMs ?? 0;

  for (const cell of splash.cells) {
    const delayMs = (cell.delayMs ?? 0) + preShrinkMs;
    delaysByColumn[cell.col] = Math.max(delaysByColumn[cell.col] ?? 0, delayMs);
  }

  return delaysByColumn;
}

export default function LevelScreen() {
  const screenWipe = useScreenWipe();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { width: screenWidth, height: screenHeight } = usePlaytestViewport();
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
  const lightningEffectPlayer = useAudioPlayer(soundRuntimeAssets.lightningEffect, {
    keepAudioSessionActive: true,
  });
  const bombEffectPlayer = useAudioPlayer(soundRuntimeAssets.bombEffect, {
    keepAudioSessionActive: true,
  });
  const lineRocketEffectPlayer = useAudioPlayer(soundRuntimeAssets.lineRocketEffect, {
    keepAudioSessionActive: true,
  });
  const fruityCrossEffectPlayer = useAudioPlayer(soundRuntimeAssets.fruityCrossEffect, {
    keepAudioSessionActive: true,
  });
  const gameplayMusicPlayer = useAudioPlayer(soundRuntimeAssets.gameplayBackgroundMusic, {
    keepAudioSessionActive: true,
  });
  const soundOutputGain = (progress.soundVolumePercent / 100) * MAX_SOUND_OUTPUT_GAIN;
  const matchSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightningEffectSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bombEffectSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineRocketEffectSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fruityCrossEffectSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const activeTimelineRef = useRef<ActiveTimelineState | null>(null);
  const [showBoosterRow, setShowBoosterRow] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const lightningScreenShake = useRef(new Animated.Value(0)).current;
  const lightningScreenShakeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const levelLayout = calculateLevelLayout({
    screenWidth,
    screenHeight,
    rows: level.rows,
    cols: level.cols,
  });
  const { boosters, grid, hud, settingsButton } = levelLayout;
  const canUseBombBooster = DEBUG_UNLIMITED_BOOSTERS || progress.inventory.boosters.bomb > 0;
  const canUseHammerBooster = DEBUG_UNLIMITED_BOOSTERS || progress.inventory.boosters.hammer > 0;
  const canUseLineRocketBooster = DEBUG_UNLIMITED_BOOSTERS || progress.inventory.boosters.lineRocket > 0;
  const canUseFruityCrossBooster = DEBUG_UNLIMITED_BOOSTERS || progress.inventory.boosters.fruityCross > 0;
  const canUseLightningFruitsBooster =
    DEBUG_UNLIMITED_BOOSTERS || progress.inventory.boosters.lightningFruits > 0;
  const remainingMoves = Math.max(0, level.moveLimit - engineState.movesUsed);
  const moveDigits = getTwoDigitMoves(remainingMoves);
  const scoreDigits = getScoreDigits(engineState.score, hud.scoreValue.digits);
  const finishTargetScore = level.targetScore;
  const scoreProgress = Math.max(0, Math.min(1, engineState.score / finishTargetScore));
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

  function clearPendingLightningEffectSound() {
    if (lightningEffectSoundTimer.current === null) {
      return;
    }

    clearTimeout(lightningEffectSoundTimer.current);
    lightningEffectSoundTimer.current = null;
  }

  function clearPendingBombEffectSound() {
    if (bombEffectSoundTimer.current === null) {
      return;
    }

    clearTimeout(bombEffectSoundTimer.current);
    bombEffectSoundTimer.current = null;
  }

  function clearPendingLineRocketEffectSound() {
    if (lineRocketEffectSoundTimer.current === null) {
      return;
    }

    clearTimeout(lineRocketEffectSoundTimer.current);
    lineRocketEffectSoundTimer.current = null;
  }

  function clearPendingFruityCrossEffectSound() {
    if (fruityCrossEffectSoundTimer.current === null) {
      return;
    }

    clearTimeout(fruityCrossEffectSoundTimer.current);
    fruityCrossEffectSoundTimer.current = null;
  }

  function clearPendingDirectPower() {
    if (directPowerTimer.current === null) {
      return;
    }

    clearTimeout(directPowerTimer.current);
    directPowerTimer.current = null;
    directPowerStartTimes.current.clear();
  }

  function playLightningScreenShake(delayMs = 0) {
    if (!progress.shakingEnabled) {
      stopLightningScreenShake();
      return;
    }

    lightningScreenShakeAnimation.current?.stop();
    lightningScreenShake.setValue(0);
    const shakeAnimation = Animated.timing(lightningScreenShake, {
      toValue: 1,
      duration: 360,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const animation =
      delayMs > 0
        ? Animated.sequence([Animated.delay(delayMs), shakeAnimation])
        : shakeAnimation;

    lightningScreenShakeAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        lightningScreenShake.setValue(0);
      }
      if (lightningScreenShakeAnimation.current === animation) {
        lightningScreenShakeAnimation.current = null;
      }
    });
  }

  function stopLightningScreenShake() {
    lightningScreenShakeAnimation.current?.stop();
    lightningScreenShakeAnimation.current = null;
    lightningScreenShake.setValue(0);
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

  function playLightningEffectSound(delayMs = 0) {
    clearPendingLightningEffectSound();

    if (!progress.soundEnabled) {
      return;
    }

    const play = () => {
      lightningEffectSoundTimer.current = null;
      void lightningEffectPlayer.seekTo(0).finally(() => lightningEffectPlayer.play());
    };

    if (delayMs <= 0) {
      play();
      return;
    }

    lightningEffectSoundTimer.current = setTimeout(play, delayMs);
  }

  function playBombEffectSound(delayMs = 0) {
    clearPendingBombEffectSound();

    if (!progress.soundEnabled) {
      return;
    }

    const play = () => {
      bombEffectSoundTimer.current = null;
      void bombEffectPlayer.seekTo(0).finally(() => bombEffectPlayer.play());
    };

    if (delayMs <= 0) {
      play();
      return;
    }

    bombEffectSoundTimer.current = setTimeout(play, delayMs);
  }

  function playLineRocketEffectSound(delayMs = 0) {
    clearPendingLineRocketEffectSound();

    if (!progress.soundEnabled) {
      return;
    }

    const play = () => {
      lineRocketEffectSoundTimer.current = null;
      void lineRocketEffectPlayer.seekTo(0).finally(() => lineRocketEffectPlayer.play());
    };

    if (delayMs <= 0) {
      play();
      return;
    }

    lineRocketEffectSoundTimer.current = setTimeout(play, delayMs);
  }

  function playFruityCrossEffectSound(delayMs = 0) {
    clearPendingFruityCrossEffectSound();

    if (!progress.soundEnabled) {
      return;
    }

    const play = () => {
      fruityCrossEffectSoundTimer.current = null;
      void fruityCrossEffectPlayer.seekTo(0).finally(() => fruityCrossEffectPlayer.play());
    };

    if (delayMs <= 0) {
      play();
      return;
    }

    fruityCrossEffectSoundTimer.current = setTimeout(play, delayMs);
  }

  useEffect(() => {
    if (!progress.hydrated || requestedLevelId === levelId) {
      return;
    }

    screenWipe.replace(`/level/${levelId}`);
  }, [levelId, progress.hydrated, requestedLevelId, screenWipe]);

  useEffect(() => {
    matchSoundPlayer.volume = soundOutputGain;
    lightningEffectPlayer.volume = soundOutputGain;
    bombEffectPlayer.volume = soundOutputGain;
    lineRocketEffectPlayer.volume = soundOutputGain;
    fruityCrossEffectPlayer.volume = soundOutputGain;
    gameplayMusicPlayer.volume = soundOutputGain;
  }, [
    bombEffectPlayer,
    fruityCrossEffectPlayer,
    gameplayMusicPlayer,
    lightningEffectPlayer,
    lineRocketEffectPlayer,
    matchSoundPlayer,
    soundOutputGain,
  ]);

  useEffect(() => {
    gameplayMusicPlayer.loop = true;

    if (progress.soundEnabled && !paused) {
      gameplayMusicPlayer.play();
    } else {
      gameplayMusicPlayer.pause();
    }
  }, [gameplayMusicPlayer, paused, progress.soundEnabled]);

  useEffect(() => {
    void warmGameplayAssets();
    const timer = setTimeout(() => setShowBoosterRow(true), 140);

    return () => {
      clearTimeout(timer);
      clearPendingMatchSound();
      clearPendingLightningEffectSound();
      clearPendingBombEffectSound();
      clearPendingLineRocketEffectSound();
      clearPendingFruityCrossEffectSound();
      clearPendingDirectPower();
      stopLightningScreenShake();
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
    clearPendingLightningEffectSound();
    clearPendingBombEffectSound();
    clearPendingLineRocketEffectSound();
    clearPendingFruityCrossEffectSound();
    clearPendingDirectPower();
    stopLightningScreenShake();
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
    setHammerAnimation(null);
    setPendingHammerClear(null);
    setRecommendedMove(null);
    setActiveTimeline(null);
    activeTimelineCompletion.current = null;
    activeTimelineRef.current = null;
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
    activeTimelineRef.current = null;
    runStateUpdates(() => {
      setMatchSplash(null);
      setDropAnimation(null);
      setReshuffleAnimation(null);
      setSpecialMergeAnimation(null);
      setSpecialWipeAnimation(null);
      setEngineState(toEngineState(state));
      setActiveTimeline(null);
      setMatchDisplayBoard(null);
    });
    stopLightningScreenShake();
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
      runStateUpdates(() => {
        setBombDropAnimation(null);
        setMatchDisplayBoard(job.board);
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
      runStateUpdates(() => {
        setBombDropAnimation(null);
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
      const overlappedDrop = getOverlappedDrop(job);
      const overlappedDropStartDelaysByColumn =
        overlappedDrop?.startDelaysByColumn ?? createDropStartDelaysByColumnFromSplash(job.companionSplash);
      runStateUpdates(() => {
        setBombDropAnimation(null);
        setDropAnimation(
          overlappedDrop
            ? {
                key: overlappedDrop.key,
                motions: overlappedDrop.motions,
                hiddenCells: overlappedDrop.hiddenCells,
                startDelaysByColumn: overlappedDropStartDelaysByColumn,
              }
            : null,
        );
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
      playMatchSound(getMatchSoundDelayMs(job.companionSplash));
      return;
    }

    if (job.type === 'special-wipe') {
      const overlappedDrop = getOverlappedDrop(job);
      const columnCount = job.board[0]?.length ?? 0;
      const lineRocketDirection = job.sourceTool === 'lineRocket' ? job.rowTravelDirection : undefined;
      const isLightningFruitsWipe = job.sourceTool === 'lightningFruits';
      const lightningPreviewStarted = isLightningFruitsWipe && directPowerStartTimes.current.has(job.key);
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
      const primaryDurationMs =
        job.sourceTool === 'fruityCross'
          ? Math.max(1, maxDelayMs - FRUITY_CROSS_GROUP_DROP_MS) + preDelayMs + SPECIAL_WIPE_SPLASH_DURATION_MS
          : maxDelayMs + preDelayMs + SPECIAL_WIPE_SPLASH_DURATION_MS;
      const chainedDurationMs =
        job.chainedWipes?.reduce(
          (maxDuration, chain) => {
            const chainMaxDelayMs = getSpecialWipeMaxDelayMs(chain.cells, chain.origin);

            return Math.max(
              maxDuration,
              chain.triggerDelayMs +
                getSpecialWipePreShrinkMs(undefined) +
                chainMaxDelayMs +
                SPECIAL_WIPE_SPLASH_DURATION_MS,
            );
          },
          0,
        ) ?? 0;
      const durationMs = Math.max(primaryDurationMs, chainedDurationMs);
      const initialElapsedMs =
        lightningPreviewStarted
          ? Math.min(
              Math.max(0, Date.now() - (directPowerStartTimes.current.get(job.key) ?? Date.now())),
              Math.max(0, durationMs - MIN_REAL_LIGHTNING_WIPE_MS),
            )
          : undefined;
      const splash =
        job.sourceTool === 'fruityCross'
          ? null
          : createCellSplashFromBoard(job.key, job.board, job.cells, job.origin, {
              sourceTool: job.sourceTool,
              rowTravelDirection: job.rowTravelDirection,
            });
      const overlappedDropStartDelaysByColumn =
        overlappedDrop?.startDelaysByColumn ?? createDropStartDelaysByColumnFromSplash(splash);
      runStateUpdates(() => {
        setBombDropAnimation(null);
        setDropAnimation(
          overlappedDrop
            ? {
                key: overlappedDrop.key,
                motions: overlappedDrop.motions,
                hiddenCells: overlappedDrop.hiddenCells,
                startDelaysByColumn: overlappedDropStartDelaysByColumn,
              }
            : null,
        );
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
          chainedWipes: job.chainedWipes,
          targetFruit: job.targetFruit,
          sourceTool: job.sourceTool,
          rowTravelDirection: job.rowTravelDirection,
          preDelayMs,
          durationMs,
          groupDropCompleted: job.sourceTool === 'fruityCross',
          initialElapsedMs,
          suppressLightningOverlay: isLightningFruitsWipe,
        });
      });
      if (job.sourceTool === 'lineRocket') {
        playLineRocketEffectSound();
      }
      if (job.sourceTool === 'fruityCross') {
        playFruityCrossEffectSound(FRUITY_CROSS_SPLIT_LAUNCH_MS);
      }
      playMatchSound(getMatchSoundDelayMs(splash));
      return;
    }

    if (job.type === 'bomb-clear') {
      runStateUpdates(() => {
        setMatchSplash(null);
        setReshuffleAnimation(null);
        setSpecialMergeAnimation(null);
        setSpecialWipeAnimation(null);
        setMatchDisplayBoard(job.board);
        setBombDropAnimation({
          key: job.key,
          target: job.target,
          blastCells: job.cells,
        });
        setDropAnimation(null);
      });
      playBombEffectSound(BOMB_DROP_DURATION_MS + BOMB_IMPACT_DURATION_MS);
      playMatchSound();
      return;
    }

    if (job.type === 'reshuffle') {
      runStateUpdates(() => {
        setBombDropAnimation(null);
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
          job.type === 'bomb-clear' ||
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
    const timelineState = {
      activeJobIndex: firstJobIndex,
      jobs,
      state,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(jobs[firstJobIndex]),
    };
    activeTimelineRef.current = timelineState;
    setActiveTimeline(timelineState);
  }

  function advanceToNextTimelineJob(timeline: ActiveTimelineState) {
    const nextJobIndex = getNextRenderableJobIndex(
      timeline.jobs,
      timeline.activeJobIndex + 1,
    );
    const nextJob = nextJobIndex === -1 ? undefined : timeline.jobs[nextJobIndex];

    if (!nextJob) {
      activeTimelineCompletion.current = null;
      activeTimelineRef.current = null;
      commitResolvedState(timeline.state);
      return true;
    }

    applyTimelineJob(nextJob);
    activeTimelineCompletion.current = {
      activeJobIndex: nextJobIndex,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(nextJob),
    };
    const timelineState = {
      activeJobIndex: nextJobIndex,
      jobs: timeline.jobs,
      state: timeline.state,
      completedPrimary: false,
      completedOverlappedDrop: !hasOverlappedDrop(nextJob),
    };
    activeTimelineRef.current = timelineState;
    setActiveTimeline(timelineState);
    return true;
  }

  function advanceTimeline(jobType: CascadeSequenceJob['type'], key: number) {
    const timeline = activeTimeline ?? activeTimelineRef.current;
    if (!timeline) {
      return false;
    }

    const activeJob = timeline.jobs[timeline.activeJobIndex];
    if (!activeJob || activeJob.type !== jobType || activeJob.key !== key) {
      return false;
    }

    const completion = activeTimelineCompletion.current;
    const completedOverlappedDrop =
      completion && completion.activeJobIndex === timeline.activeJobIndex
        ? completion.completedOverlappedDrop
        : timeline.completedOverlappedDrop;

    if (hasOverlappedDrop(activeJob) && !completedOverlappedDrop) {
      activeTimelineCompletion.current = {
        activeJobIndex: timeline.activeJobIndex,
        completedPrimary: true,
        completedOverlappedDrop,
      };
      setActiveTimeline((current) =>
        current && current.activeJobIndex === timeline.activeJobIndex
          ? {
              ...current,
              completedPrimary: true,
            }
          : current,
      );
      return true;
    }

    return advanceToNextTimelineJob(timeline);
  }

  function completeOverlappedDrop(key: number) {
    const timeline = activeTimeline ?? activeTimelineRef.current;
    if (!timeline) {
      return false;
    }

    const activeJob = timeline.jobs[timeline.activeJobIndex];
    const overlappedDrop = getOverlappedDrop(activeJob);
    if (!overlappedDrop || overlappedDrop.key !== key) {
      return false;
    }

    const completion = activeTimelineCompletion.current;
    const completedPrimary =
      completion && completion.activeJobIndex === timeline.activeJobIndex
        ? completion.completedPrimary
        : timeline.completedPrimary;

    if (completedPrimary) {
      return advanceToNextTimelineJob(timeline);
    }

    activeTimelineCompletion.current = {
      activeJobIndex: timeline.activeJobIndex,
      completedPrimary,
      completedOverlappedDrop: true,
    };
    setActiveTimeline((current) =>
      current && current.activeJobIndex === timeline.activeJobIndex
        ? {
            ...current,
            completedOverlappedDrop: true,
          }
        : current,
    );
    return true;
  }

  function saveEarnedStars(score: number, stars: number) {
    if (stars <= 0) {
      return 0;
    }

    const coinReward = calculateLevelCoinReward(progress, level.id, stars);
    void progress.completeLevel(level.id, score, stars);
    return coinReward;
  }

  useEffect(() => {
    const stars = calculateStars(engineState.score, level.star1, level.star2, level.star3);
    if (engineState.score >= finishTargetScore) {
      if (completedLevelRef.current === level.id) {
        return;
      }

      completedLevelRef.current = level.id;
      const coinReward = saveEarnedStars(engineState.score, stars);
      screenWipe.replace({
        pathname: '/results',
        params: {
          levelId: String(level.id),
          score: String(engineState.score),
          stars: String(stars),
          coinReward: String(coinReward),
          won: '1',
        },
      });
    }
  }, [engineState.score, finishTargetScore, level, progress, screenWipe]);

  useEffect(() => {
    if (engineState.score >= finishTargetScore) return;
    if (engineState.movesUsed < level.moveLimit) return;
    if (completedLevelRef.current === level.id) return;

    const stars = calculateStars(engineState.score, level.star1, level.star2, level.star3);

    completedLevelRef.current = level.id;
    const coinReward = saveEarnedStars(engineState.score, stars);
    screenWipe.replace({
      pathname: '/results',
      params: {
        levelId: String(level.id),
        score: String(engineState.score),
        stars: String(stars),
        coinReward: String(coinReward),
        won: stars > 0 ? '1' : '0',
      },
    });
  }, [
    engineState.movesUsed,
    engineState.score,
    finishTargetScore,
    level.id,
    level.moveLimit,
    level.star1,
    level.star2,
    level.star3,
    progress,
    screenWipe,
  ]);

  useEffect(() => {
    if (!TIMER_ENABLED) return;
    if (timeLeft > 0) return;

    const stars = calculateStars(engineState.score, level.star1, level.star2, level.star3);
    const coinReward = saveEarnedStars(engineState.score, stars);
    screenWipe.replace({
      pathname: '/results',
      params: {
        levelId: String(level.id),
        score: String(engineState.score),
        stars: String(stars),
        coinReward: String(coinReward),
        won: stars > 0 ? '1' : '0',
      },
    });
  }, [engineState.score, finishTargetScore, level, progress, screenWipe, timeLeft]);

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

  async function activateDirectSpecialPower(tool: DirectSpecialPowerTool, target: Position) {
    if (!DEBUG_UNLIMITED_BOOSTERS) {
      const consumed = await progress.consumeBooster(getBoosterInventoryId(tool));

      if (!consumed) {
        setSelectedBoardTool(null);
        setSelected(null);
        return;
      }
    }

    const key = Date.now();
    const boardSnapshot = engineState.board;
    const stateSnapshot = engineState;
    clearPendingDirectPower();
    runStateUpdates(() => {
      setSelectedBoardTool(null);
      setSelected(null);
      setRecommendedMove(null);
      setDropAnimation(null);
      setReshuffleAnimation(null);
      setSpecialMergeAnimation(null);
      setSpecialWipeAnimation(null);
      setActiveTimeline(null);
      activeTimelineCompletion.current = null;
      activeTimelineRef.current = null;
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
    if (tool === 'lightningFruits') {
      const targetCell = boardSnapshot[target.row]?.[target.col];
      if (targetCell) {
        const targetFruit = getCellFruit(targetCell);
        const lightningCells = boardSnapshot.flatMap((row, rowIndex) =>
          row.flatMap((cell, colIndex) => (getCellFruit(cell) === targetFruit ? [{ row: rowIndex, col: colIndex }] : [])),
        );
        const preDelayMs = getSpecialWipePreShrinkMs('lightningFruits');
        const previewDurationMs = getSpecialWipeMaxDelayMs(lightningCells, target) + preDelayMs + SPECIAL_WIPE_SPLASH_DURATION_MS;
        directPowerStartTimes.current.set(key, Date.now());
        playLightningScreenShake(Math.round(previewDurationMs * LIGHTNING_STRIKE_START_AT));
        playLightningEffectSound(Math.round(previewDurationMs * LIGHTNING_STRIKE_START_AT));
        setSpecialWipeAnimation({
          key: key - 1,
          board: boardSnapshot,
          origin: target,
          kind: 'color-clear',
          cells: lightningCells,
          targetFruit,
          sourceTool: 'lightningFruits',
          preDelayMs,
          durationMs: previewDurationMs,
          previewOnly: true,
        });
      }
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
    }, tool === 'fruityCross' ? FRUITY_CROSS_GROUP_DROP_MS : tool === 'lightningFruits' ? 16 : 0);
  }

  async function handleSelect(position: Position) {
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
      const boardSnapshot = engineState.board;
      const stateSnapshot = engineState;
      if (!DEBUG_UNLIMITED_BOOSTERS) {
        const consumed = await progress.consumeBooster('bomb');
        if (!consumed) {
          setSelectedBoardTool(null);
          setSelected(null);
          return;
        }
      }
      const refillSeed = level.seed + stateSnapshot.movesUsed * 101 + position.row * 17 + position.col * 31;
      const cascadeRefillSeed =
        level.seed + stateSnapshot.movesUsed * 101 + position.row * 19 + position.col * 37 + 256;
      const sequence = resolveBombClearSequence({
        key,
        target: position,
        board: boardSnapshot,
        engineState: stateSnapshot,
        refill: createSeededRefill({ seed: refillSeed, fruitTypes: level.fruitTypes }),
        cascadeRefill: createSeededRefill({ seed: cascadeRefillSeed, fruitTypes: level.fruitTypes }),
        reshuffle: (board: Board) => createBoard({ seed: level.seed + stateSnapshot.movesUsed + 299 }),
      });
      runStateUpdates(() => {
        setDropAnimation(null);
        setReshuffleAnimation(null);
        setSpecialMergeAnimation(null);
        setSpecialWipeAnimation(null);
        setActiveTimeline(null);
        activeTimelineCompletion.current = null;
        activeTimelineRef.current = null;
      });
      startTimeline(sequence.jobs, sequence.state);
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

      if (!DEBUG_UNLIMITED_BOOSTERS) {
        const consumed = await progress.consumeBooster('hammer');
        if (!consumed) {
          setSelectedBoardTool(null);
          setSelected(null);
          return;
        }
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
      await activateDirectSpecialPower(selectedBoardTool, position);
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
    if (completeOverlappedDrop(key)) {
      return;
    }
    setDropAnimation((current) => (current?.key === key ? null : current));
    if (!activeTimeline && !activeTimelineRef.current) {
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
    directPowerStartTimes.current.delete(key);
    setSpecialWipeAnimation((current) => (current?.key === key && !current.previewOnly ? null : current));
    advanceTimeline('special-wipe', key);
  }

  function handleBombClearComplete(key: number) {
    setBombDropAnimation((current) => (current?.key === key ? null : current));
    advanceTimeline('bomb-clear', key);
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

    runStateUpdates(() => {
      setHammerAnimation(null);
      setPendingHammerClear(null);
      setActiveTimeline(null);
      activeTimelineCompletion.current = null;
      activeTimelineRef.current = null;
    });
    startTimeline(
      sequence.jobs,
      sequence.state,
    );
    playMatchSound();
  }

  const boardToolButtons: Array<{
    id: VisibleBoardToolId;
    label: string;
    source: number;
    disabled: boolean;
    count: number;
  }> = [
    {
      id: 'bomb',
      label: 'Bomb booster',
      source: uiRuntimeAssets.gameplayBombButton,
      disabled: !canUseBombBooster,
      count: DEBUG_UNLIMITED_BOOSTERS ? DEBUG_UNLIMITED_BOOSTER_COUNT : progress.inventory.boosters.bomb,
    },
    {
      id: 'lineRocket',
      label: 'LineRocket',
      source: uiRuntimeAssets.gameplayLineRocketButton,
      disabled: !canUseLineRocketBooster,
      count: DEBUG_UNLIMITED_BOOSTERS ? DEBUG_UNLIMITED_BOOSTER_COUNT : progress.inventory.boosters.lineRocket,
    },
    {
      id: 'fruityCross',
      label: 'FruityCross',
      source: uiRuntimeAssets.gameplayFruityCrossButton,
      disabled: !canUseFruityCrossBooster,
      count: DEBUG_UNLIMITED_BOOSTERS ? DEBUG_UNLIMITED_BOOSTER_COUNT : progress.inventory.boosters.fruityCross,
    },
    {
      id: 'lightningFruits',
      label: 'LightningFruits',
      source: uiRuntimeAssets.gameplayLightningFruitsButton,
      disabled: !canUseLightningFruitsBooster,
      count: DEBUG_UNLIMITED_BOOSTERS ? DEBUG_UNLIMITED_BOOSTER_COUNT : progress.inventory.boosters.lightningFruits,
    },
  ];
  const lightningScreenShakeX = lightningScreenShake.interpolate({
    inputRange: [0, 0.02, 0.08, 0.16, 0.28, 0.42, 0.6, 0.78, 1],
    outputRange: [0, -4, 5, -4, 4, -3, 2, -1, 0],
    extrapolate: 'clamp',
  });
  const lightningScreenShakeY = lightningScreenShake.interpolate({
    inputRange: [0, 0.025, 0.1, 0.2, 0.36, 0.54, 0.76, 1],
    outputRange: [0, 2, -3, 2, -2, 1, -1, 0],
    extrapolate: 'clamp',
  });
  const lightningScreenShakeScale = lightningScreenShake.interpolate({
    inputRange: [0, 0.02, 0.78, 1],
    outputRange: [1, 1.015, 1.015, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: lightningScreenShakeX }, { translateY: lightningScreenShakeY }, { scale: lightningScreenShakeScale }],
        }}
      >
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
                bombExplosionSource={uiRuntimeAssets.gameplayBombExploded}
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
                onBombDropAnimationComplete={handleBombClearComplete}
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
                const disabled = tool.disabled;

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
                        setSelectedBoardTool(null);
                        setSelected(null);
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
                      overflow: 'visible',
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
                    <BoosterCountLabel count={tool.count} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
      </ImageBackground>
      </Animated.View>

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

      <SettingsOverlay
        visible={showSettingsOverlay}
        onClose={() => setShowSettingsOverlay(false)}
        onGoHome={() => {
          setShowSettingsOverlay(false);
          screenWipe.replace('/map');
        }}
      />
    </View>
  );
}
