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
import { createBoard, isAdjacent, swapCells } from '@/game/board';
import { getBombBlastCells } from '@/game/boosters/bomb';
import { findRecommendedMove, type RecommendedMove } from '@/game/move-hints';
import type { Board, EngineState, Position, ScoreEvent } from '@/game/types';
import { isBoardInteractionLocked } from '@/gameplay/interaction';
import { calculateLevelLayout } from '@/gameplay/level-layout';
import { createMatchSteps, resolveBombClearSequence, resolveHammerClearSequence, type MatchStep, type ResolvedState } from '@/gameplay/match-cascade';
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

const SETTINGS_BUTTON_TOP = 40;
const SETTINGS_BUTTON_RIGHT = 10;
const SETTINGS_BUTTON_SIZE = 70;

const HUD_TOP = 100;
const HUD_WIDTH = 440;
const HUD_HEIGHT = 125;
const SCORE_BAR_TOP = 0;
const SCORE_BAR_LEFT = 11;
const SCORE_BAR_WIDTH = 476;
const SCORE_BAR_HEIGHT = 108;
const PROGRESS_BAR_TOP = 13;
const PROGRESS_BAR_LEFT = 120;
const PROGRESS_BAR_WIDTH = 200;
const PROGRESS_BAR_HEIGHT = 82;
const PROGRESS_FILL_TOP = PROGRESS_BAR_TOP + 31;
const PROGRESS_FILL_LEFT = PROGRESS_BAR_LEFT +13;
const PROGRESS_FILL_WIDTH = PROGRESS_BAR_WIDTH - 20;
const PROGRESS_FILL_MAX_WIDTH = 173;
const PROGRESS_FILL_HEIGHT = 20;
const PROGRESS_FILL_MIN_WIDTH = 16;
const PROGRESS_STAR_SIZE = 50;
const PROGRESS_STAR_TOP = PROGRESS_FILL_TOP - 25;
const PROGRESS_STAR_THRESHOLDS = [0.1, 0.75, 1] as const;

// Score value is displayed using a sprite strip, so we need to define the dimensions and positioning of each digit.
const SCORE_VALUE_TOP = 40;
const SCORE_VALUE_LEFT = PROGRESS_BAR_LEFT + PROGRESS_BAR_WIDTH + 5;
const SCORE_VALUE_DIGITS = 5;
const SCORE_VALUE_NUMBER_HEIGHT = 20;
const SCORE_VALUE_NUMBER_WIDTH = 15;
const SCORE_VALUE_NUMBER_GAP = 2;

const MOVES_BAR_TOP = -17;
const MOVES_BAR_LEFT = 0;
const MOVES_BAR_SIZE = 140;
const MAX_MOVES = 30;
const MOVES_NUMBER_TOP = 38;
const MOVES_NUMBER_LEFT = 32;
const MOVES_NUMBER_HEIGHT = 40;
const MOVES_NUMBER_GAP = -3;
const MOVES_NUMBER_WIDTH = 40;
const MOVES_NUMBER_SPRITE_DIGITS = 10;

// Grid tuning: change these when you want to move or resize the board.
const GRID_SCREEN_PADDING = 0;
const GRID_SIDE_MARGIN = 14;
const GRID_TILE_GAP = 4;
const GRID_BOARD_PADDING = 4;
const GRID_FRAME_PADDING = 4;
const GRID_INNER_FRAME_PADDING = 4;
const GRID_CELL_AREA_PADDING = 4;
const GRID_FRUIT_IMAGE_SCALE = 1.2;
const MOVE_HINT_IDLE_DELAY_MS = 5000;
const DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE = true;
const SETTINGS_PANEL_MAX_WIDTH = 520;
const SETTINGS_PANEL_MAX_HEIGHT = 760;
const SETTINGS_EXIT_BUTTON_SIZE = 64;
const SETTINGS_EXIT_BUTTON_TOP = 170;
const SETTINGS_EXIT_BUTTON_RIGHT = -5;
const SETTINGS_MENU_BUTTON_WIDTH = 140;
const SETTINGS_MENU_BUTTON_HEIGHT = 140;
const SETTINGS_MENU_BUTTON_GAP = 18;

function getTwoDigitMoves(moves: number) {
  return String(Math.max(0, Math.min(99, moves))).padStart(2, '0').split('').map(Number);
}

function getScoreDigits(score: number) {
  return String(Math.max(0, Math.min(99999, score))).padStart(SCORE_VALUE_DIGITS, '0').split('').map(Number);
}

type PendingSwapState = {
  key: number;
  from: Position;
  to: Position;
  fromFruit: number;
  toFruit: number;
  accepted: boolean;
  result: ResolveSwapResult;
  splash: MatchSplash | null;
  matchSteps: MatchStep[];
  matchedBoard: Board | null;
};

function toEngineState(state: ResolvedState): EngineState {
  return {
    board: state.board,
    score: state.score,
    movesUsed: state.movesUsed,
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
  const [bombButtonChosen, setBombButtonChosen] = useState(false);
  const [bombDropAnimation, setBombDropAnimation] = useState<BombDropAnimation | null>(null);
  const [pendingBombClear, setPendingBombClear] = useState<{ key: number; target: Position; board: Board } | null>(
    null,
  );
  const [hammerButtonChosen, setHammerButtonChosen] = useState(false);
  const [hammerAnimation, setHammerAnimation] = useState<HammerAnimation | null>(null);
  const [pendingHammerClear, setPendingHammerClear] = useState<{ key: number; target: Position; board: Board } | null>(
    null,
  );
  const [recommendedMove, setRecommendedMove] = useState<RecommendedMove | null>(null);
  const [pendingResolvedState, setPendingResolvedState] = useState<{
    key: number;
    activeStepIndex: number;
    steps: MatchStep[];
    state: ResolvedState;
  } | null>(null);
  const [pendingPostDropResolution, setPendingPostDropResolution] = useState<{
    dropKey: number;
    steps: MatchStep[];
    state: ResolvedState;
  } | null>(null);
  const [pendingReshuffleResolution, setPendingReshuffleResolution] = useState<{
    key: number;
    state: ResolvedState;
  } | null>(null);
  const [showBoosterRow, setShowBoosterRow] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const settingsExitScale = useRef(new Animated.Value(1)).current;
  const settingsHomeScale = useRef(new Animated.Value(1)).current;
  const settingsMapScale = useRef(new Animated.Value(1)).current;
  const moveDigits = getTwoDigitMoves(MAX_MOVES - engineState.movesUsed);
  const scoreDigits = getScoreDigits(engineState.score);
  const scoreProgress = Math.max(0, Math.min(1, engineState.score / level.targetScore));
  const progressFillWidth =
    scoreProgress <= 0
      ? PROGRESS_FILL_MIN_WIDTH
      : PROGRESS_FILL_MIN_WIDTH + (PROGRESS_FILL_MAX_WIDTH - PROGRESS_FILL_MIN_WIDTH) * scoreProgress;
  const levelLayout = calculateLevelLayout({
    screenWidth,
    screenHeight,
    rows: level.rows,
    cols: level.cols,
  });
  const canUseBombBooster = DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE || progress.inventory.boosters.bomb > 0;
  const canUseHammerBooster = DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE || progress.inventory.boosters.hammer > 0;
  const getProgressCheckpointX = (threshold: number) =>
    PROGRESS_FILL_LEFT +
    PROGRESS_FILL_MIN_WIDTH +
    (PROGRESS_FILL_MAX_WIDTH - PROGRESS_FILL_MIN_WIDTH) * threshold;
  const boardInteractionLocked = isBoardInteractionLocked({
    paused,
    hasPendingSwap: Boolean(pendingSwap),
    hasMatchSplash: Boolean(matchSplash),
    hasDropAnimation: Boolean(dropAnimation),
    hasPendingResolvedState:
      Boolean(pendingResolvedState) ||
      Boolean(pendingPostDropResolution) ||
      Boolean(reshuffleAnimation) ||
      Boolean(pendingReshuffleResolution) ||
      Boolean(bombDropAnimation) ||
      Boolean(pendingBombClear) ||
      Boolean(hammerAnimation) ||
      Boolean(pendingHammerClear),
  });

  function playMatchSound() {
    if (!progress.soundEnabled) {
      return;
    }

    void matchSoundPlayer.seekTo(0).finally(() => matchSoundPlayer.play());
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

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showBoosterRow) {
      return;
    }

    screenWipe.setScreenReady();
  }, [screenWipe, showBoosterRow]);

  useEffect(() => {
    completedLevelRef.current = null;
    setEngineState(createLevelState(level.seed));
    setSelected(null);
    setPaused(false);
    setTimeLeft(level.timeLimitSeconds);
    setPendingSwap(null);
    setMatchSplash(null);
    setMatchDisplayBoard(null);
    setDropAnimation(null);
    setReshuffleAnimation(null);
    setBombButtonChosen(false);
    setBombDropAnimation(null);
    setPendingBombClear(null);
    setHammerButtonChosen(false);
    setHammerAnimation(null);
    setPendingHammerClear(null);
    setRecommendedMove(null);
    setPendingResolvedState(null);
    setPendingPostDropResolution(null);
    setPendingReshuffleResolution(null);
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

  function stageAcceptedMatch(swap: PendingSwapState) {
    if (swap.matchSteps.length === 0) {
      return;
    }
    const firstStep = swap.matchSteps[0];
    if (matchSplash?.key === firstStep.splash.key) {
      return;
    }

    unstable_batchedUpdates(() => {
      setMatchDisplayBoard(firstStep.board);
      setMatchSplash(firstStep.splash);
      setPendingResolvedState({
        key: swap.key,
        activeStepIndex: 0,
        steps: swap.matchSteps,
        state: swap.result,
      });
      setPendingSwap((current) => (current?.key === swap.key ? null : current));
    });
    playMatchSound();
  }

  function commitResolvedState(state: ResolvedState) {
    const reshuffle = state.reshuffle;
    if (reshuffle) {
      const key = Date.now();
      unstable_batchedUpdates(() => {
        setDropAnimation(null);
        setMatchDisplayBoard(reshuffle.before);
        setReshuffleAnimation({
          key,
          board: reshuffle.after,
        });
        setPendingReshuffleResolution({
          key,
          state,
        });
        setPendingResolvedState(null);
        setPendingPostDropResolution(null);
      });
      return;
    }

    unstable_batchedUpdates(() => {
      setDropAnimation(null);
      setEngineState(toEngineState(state));
      setPendingResolvedState(null);
      setPendingPostDropResolution(null);
      setMatchDisplayBoard(null);
    });
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
    const scoreEvents: ScoreEvent[] = [];
    const refillSeed = level.seed + engineState.movesUsed * 101 + from.row * 17 + from.col * 31 + to.row * 43 + to.col * 59;
    const result = resolveSwap(
      engineState,
      { from, to },
      {
        refill: createSeededRefill({ seed: refillSeed, fruitTypes: level.fruitTypes }),
        onScore: (event) => scoreEvents.push(event),
        reshuffle: (board: Board) => createBoard({ seed: level.seed + engineState.movesUsed + 99 }),
      },
    );
    const swapKey = Date.now();
    const matchSteps = result.accepted ? createMatchSteps(swapKey, scoreEvents) : [];
    const splash = matchSteps[0]?.splash ?? null;
    const matchedBoard = result.accepted ? swapCells(engineState.board, from, to) : null;

    setPendingSwap({
      key: swapKey,
      from,
      to,
      fromFruit: engineState.board[from.row][from.col],
      toFruit: engineState.board[to.row][to.col],
      accepted: result.accepted,
      result,
      splash,
      matchSteps,
      matchedBoard,
    });
    setSelected(null);
  }

  function handleSelect(position: Position) {
    if (boardInteractionLocked) {
      return;
    }
    setRecommendedMove(null);

    if (bombButtonChosen) {
      if (!canUseBombBooster) {
        setBombButtonChosen(false);
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
      setBombButtonChosen(false);
      setSelected(null);
      return;
    }

    if (hammerButtonChosen) {
      if (!canUseHammerBooster) {
        setHammerButtonChosen(false);
        setSelected(null);
        return;
      }

      const key = Date.now();
      if (!DEBUG_BOMB_BUTTON_ALWAYS_ACTIVE) {
        progress.consumeBooster('hammer');
      }
      setHammerAnimation({ key, target: position });
      setPendingHammerClear({ key, target: position, board: engineState.board });
      setHammerButtonChosen(false);
      setSelected(null);
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

    setBombButtonChosen(false);
    setBombDropAnimation(null);
    setPendingBombClear(null);
    setHammerButtonChosen(false);
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
      if (pendingSwap.matchSteps.length > 0) {
        stageAcceptedMatch(pendingSwap);
        return;
      } else {
        commitResolvedState(pendingSwap.result);
      }
    }

    setPendingSwap(null);
  }

  function handleMatchSplashComplete(key: number) {
    if (!pendingResolvedState) {
      setMatchSplash((current) => (current?.key === key ? null : current));
      return;
    }

    const activeStep = pendingResolvedState.steps[pendingResolvedState.activeStepIndex];
    if (activeStep?.splash.key !== key) {
      return;
    }

    unstable_batchedUpdates(() => {
      setMatchDisplayBoard(activeStep.settledBoard);
      setDropAnimation({
        key,
        motions: activeStep.dropMotions,
      });
      setMatchSplash(null);
    });
  }

  function handleDropAnimationComplete(key: number) {
    if (pendingPostDropResolution?.dropKey === key) {
      const firstStep = pendingPostDropResolution.steps[0];
      if (!firstStep) {
        commitResolvedState(pendingPostDropResolution.state);
        return;
      }

      unstable_batchedUpdates(() => {
        setDropAnimation(null);
        setMatchDisplayBoard(firstStep.board);
        setMatchSplash(firstStep.splash);
        setPendingResolvedState({
          key: firstStep.splash.key,
          activeStepIndex: 0,
          steps: pendingPostDropResolution.steps,
          state: pendingPostDropResolution.state,
        });
        setPendingPostDropResolution(null);
      });
      playMatchSound();
      return;
    }

    if (!pendingResolvedState) {
      setDropAnimation((current) => (current?.key === key ? null : current));
      return;
    }

    const activeStep = pendingResolvedState.steps[pendingResolvedState.activeStepIndex];
    if (activeStep?.splash.key !== key) {
      return;
    }

    const nextStepIndex = pendingResolvedState.activeStepIndex + 1;
    const nextStep = pendingResolvedState.steps[nextStepIndex];
    if (nextStep) {
      unstable_batchedUpdates(() => {
        setDropAnimation(null);
        setMatchDisplayBoard(nextStep.board);
        setMatchSplash(nextStep.splash);
        playMatchSound();
        setPendingResolvedState((current) =>
          current?.key === pendingResolvedState.key ? { ...current, activeStepIndex: nextStepIndex } : current,
        );
      });
      return;
    }

    commitResolvedState(pendingResolvedState.state);
  }

  function handleReshuffleAnimationComplete(key: number) {
    if (pendingReshuffleResolution?.key !== key) {
      return;
    }

    unstable_batchedUpdates(() => {
      setEngineState(toEngineState(pendingReshuffleResolution.state));
      setReshuffleAnimation(null);
      setPendingReshuffleResolution(null);
      setMatchDisplayBoard(null);
    });
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
      setMatchDisplayBoard(pendingBombClear.board);
      setPendingPostDropResolution({
        dropKey: key,
        steps: sequence.steps,
        state: sequence.state,
      });
      setDropAnimation(sequence.dropAnimation);
    });
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
      setMatchDisplayBoard(pendingHammerClear.board);
      setPendingPostDropResolution({
        dropKey: key,
        steps: sequence.steps,
        state: sequence.state,
      });
      setDropAnimation(sequence.dropAnimation);
    });
    playMatchSound();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ImageBackground source={backgroundRuntimeAssets.gameplay} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
      <Pressable
        onPress={() => setShowSettingsOverlay(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          top: SETTINGS_BUTTON_TOP,
          right: SETTINGS_BUTTON_RIGHT,
          width: SETTINGS_BUTTON_SIZE,
          height: SETTINGS_BUTTON_SIZE,
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
          top: HUD_TOP,
          left: levelLayout.hudLeft,
          width: HUD_WIDTH,
          height: HUD_HEIGHT,
          zIndex: 2,
          transform: [{ scale: levelLayout.hudScale }],
          transformOrigin: 'top left',
        }}
      >
        <Image
          source={barRuntimeAssets.score}
          fadeDuration={0}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            top: SCORE_BAR_TOP,
            left: SCORE_BAR_LEFT,
            width: SCORE_BAR_WIDTH,
            height: SCORE_BAR_HEIGHT,
            zIndex: 1,
          }}
        />
        <Image
          source={barRuntimeAssets.progress}
          fadeDuration={0}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            top: PROGRESS_BAR_TOP,
            left: PROGRESS_BAR_LEFT,
            width: PROGRESS_BAR_WIDTH,
            height: PROGRESS_BAR_HEIGHT,
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: PROGRESS_FILL_TOP,
            left: PROGRESS_FILL_LEFT,
            width: progressFillWidth,
            height: PROGRESS_FILL_HEIGHT,
            borderRadius: PROGRESS_FILL_HEIGHT / 2,
            overflow: 'hidden',
            zIndex: 3,
          }}
        >
          <Image
            source={barRuntimeAssets.progressFill}
            fadeDuration={0}
            resizeMode="stretch"
            style={{
              width: PROGRESS_FILL_WIDTH,
              height: PROGRESS_FILL_HEIGHT,
            }}
          />
        </View>
        {PROGRESS_STAR_THRESHOLDS.map((threshold) => (
          <Image
            key={threshold}
            source={scoreProgress >= threshold ? barRuntimeAssets.fullStar : barRuntimeAssets.emptyStar}
            fadeDuration={0}
            resizeMode="contain"
            style={{
              position: 'absolute',
              top: PROGRESS_STAR_TOP,
              left: getProgressCheckpointX(threshold) - PROGRESS_STAR_SIZE / 2,
              width: PROGRESS_STAR_SIZE,
              height: PROGRESS_STAR_SIZE,
              zIndex: 4,
            }}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            top: SCORE_VALUE_TOP,
            left: SCORE_VALUE_LEFT,
            zIndex: 5,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <ScoreReelDigits
            digits={scoreDigits}
            digitHeight={SCORE_VALUE_NUMBER_HEIGHT}
            digitWidth={SCORE_VALUE_NUMBER_WIDTH}
            digitGap={SCORE_VALUE_NUMBER_GAP}
            sprite={scoreNumberSpriteAsset}
            spriteDigits={MOVES_NUMBER_SPRITE_DIGITS}
          />
        </View>
        <Image
          source={barRuntimeAssets.moves}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: MOVES_BAR_TOP,
            left: MOVES_BAR_LEFT,
            width: MOVES_BAR_SIZE,
            height: MOVES_BAR_SIZE,
            zIndex: 5,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: MOVES_NUMBER_TOP,
            left: MOVES_NUMBER_LEFT,
            zIndex: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {moveDigits.map((digit, index) => (
            <View
              key={index}
              style={{
                width: MOVES_NUMBER_WIDTH,
                height: MOVES_NUMBER_HEIGHT,
                marginLeft: index === 0 ? 0 : MOVES_NUMBER_GAP,
                overflow: 'hidden',
              }}
            >
              <Image
                source={scoreNumberSpriteAsset}
                fadeDuration={0}
                resizeMode="stretch"
                style={{
                  width: MOVES_NUMBER_WIDTH * MOVES_NUMBER_SPRITE_DIGITS,
                  height: MOVES_NUMBER_HEIGHT,
                  transform: [{ translateX: -digit * MOVES_NUMBER_WIDTH }],
                }}
              />
            </View>
          ))}
        </View>
      </View>
      <View
        style={{
          flex: 1,
          padding: GRID_SCREEN_PADDING,
          paddingBottom: levelLayout.gridBottomOffset,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            gap: levelLayout.boosterButtonGap,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              borderRadius: 28,
              backgroundColor: colors.peachDeep,
              padding: GRID_FRAME_PADDING,
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
                padding: GRID_INNER_FRAME_PADDING,
              }}
            >
              <View
                style={{
                  width: '100%',
          borderRadius: 24,
                  backgroundColor: colors.coral,
                  padding: GRID_CELL_AREA_PADDING,
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
                bombDropAnimation={bombDropAnimation}
                bombDropSource={uiRuntimeAssets.gameplayBombDrop}
                hammerAnimation={hammerAnimation}
                hammerSource={uiRuntimeAssets.gameplayHammerButton}
                hint={recommendedMove}
                  maxWidth={levelLayout.boardMaxWidth}
                  horizontalMargin={GRID_SIDE_MARGIN}
                  tileGap={GRID_TILE_GAP}
                  boardPadding={GRID_BOARD_PADDING}
                  fruitImageScale={GRID_FRUIT_IMAGE_SCALE}
                  onSelect={handleSelect}
                  onSwipe={handleSwipe}
                onSwapAnimationEnd={handleSwapAnimationEnd}
                onMatchSplashComplete={handleMatchSplashComplete}
                onDropAnimationComplete={handleDropAnimationComplete}
                onReshuffleAnimationComplete={handleReshuffleAnimationComplete}
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
                gap: levelLayout.boosterButtonGap ?? 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bomb booster"
              onPress={() => {
                if (boardInteractionLocked) {
                  return;
                }
                if (!canUseBombBooster) {
                  setBombButtonChosen(false);
                  return;
                }
                setSelected(null);
                setRecommendedMove(null);
                setHammerButtonChosen(false);
                setBombButtonChosen((current) => !current);
              }}
              style={({ pressed }) => ({
                width: levelLayout.boosterButtonSize,
                height: levelLayout.boosterButtonSize,
                borderRadius: levelLayout.boosterButtonSize / 2,
                overflow: 'hidden',
                borderWidth: bombButtonChosen ? 4 : 0,
                borderColor: 'rgba(255, 248, 135, 0.95)',
                opacity: !canUseBombBooster ? 0.42 : pressed ? 0.86 : 1,
                transform: [{ scale: pressed || bombButtonChosen ? 0.94 : 1 }],
              })}
            >
              <Image
                source={uiRuntimeAssets.gameplayBombButton}
                fadeDuration={0}
                resizeMode="contain"
                style={{ width: '100%', height: '100%' }}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hammer booster"
              onPress={() => {
                if (boardInteractionLocked) {
                  return;
                }
                if (!canUseHammerBooster) {
                  setHammerButtonChosen(false);
                  return;
                }
                setSelected(null);
                setRecommendedMove(null);
                setBombButtonChosen(false);
                setHammerButtonChosen((current) => !current);
              }}
              style={({ pressed }) => ({
                width: levelLayout.boosterButtonSize,
                height: levelLayout.boosterButtonSize,
                borderRadius: levelLayout.boosterButtonSize / 2,
                overflow: 'hidden',
                borderWidth: hammerButtonChosen ? 4 : 0,
                borderColor: 'rgba(255, 248, 135, 0.95)',
                opacity: !canUseHammerBooster ? 0.42 : pressed ? 0.86 : 1,
                transform: [{ scale: pressed || hammerButtonChosen ? 0.94 : 1 }],
              })}
            >
              <Image
                source={uiRuntimeAssets.gameplayHammerButton}
                fadeDuration={0}
                resizeMode="contain"
                style={{ width: '100%', height: '100%' }}
              />
            </Pressable>
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
              width: Math.min(screenWidth * 0.88, SETTINGS_PANEL_MAX_WIDTH),
              height: Math.min(screenHeight * 0.72, SETTINGS_PANEL_MAX_HEIGHT),
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
                  gap: SETTINGS_MENU_BUTTON_GAP,
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
                    width: SETTINGS_MENU_BUTTON_WIDTH,
                    height: SETTINGS_MENU_BUTTON_HEIGHT,
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
                    width: SETTINGS_MENU_BUTTON_WIDTH,
                    height: SETTINGS_MENU_BUTTON_HEIGHT,
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
                top: SETTINGS_EXIT_BUTTON_TOP,
                right: SETTINGS_EXIT_BUTTON_RIGHT,
                width: SETTINGS_EXIT_BUTTON_SIZE,
                height: SETTINGS_EXIT_BUTTON_SIZE,
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
