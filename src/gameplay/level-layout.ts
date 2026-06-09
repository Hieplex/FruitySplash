type LevelLayoutInput = {
  screenWidth: number;
  screenHeight: number;
  rows: number;
  cols: number;
};

const HUD_BASE_WIDTH = 440;
const HUD_BASE_HEIGHT = 125;
const HUD_LEFT_NUDGE_RATIO = -20 / HUD_BASE_WIDTH;
const HUD_WIDTH_RATIO = 0.95;
const HUD_TOP_RATIO = 0.095;

const SCORE_BAR_TOP_RATIO = 0 / HUD_BASE_HEIGHT;
const SCORE_BAR_LEFT_RATIO = 11 / HUD_BASE_WIDTH;
const SCORE_BAR_WIDTH_RATIO = 476 / HUD_BASE_WIDTH;
const SCORE_BAR_HEIGHT_RATIO = 108 / HUD_BASE_HEIGHT;
const PROGRESS_BAR_TOP_RATIO = 13 / HUD_BASE_HEIGHT;
const PROGRESS_BAR_LEFT_RATIO = 120 / HUD_BASE_WIDTH;
const PROGRESS_BAR_WIDTH_RATIO = 200 / HUD_BASE_WIDTH;
const PROGRESS_BAR_HEIGHT_RATIO = 82 / HUD_BASE_HEIGHT;
const PROGRESS_FILL_TOP_RATIO = 44 / HUD_BASE_HEIGHT;
const PROGRESS_FILL_LEFT_RATIO = 133 / HUD_BASE_WIDTH;
const PROGRESS_FILL_WIDTH_RATIO = 180 / HUD_BASE_WIDTH;
const PROGRESS_FILL_MAX_WIDTH_RATIO = 173 / HUD_BASE_WIDTH;
const PROGRESS_FILL_HEIGHT_RATIO = 20 / HUD_BASE_HEIGHT;
const PROGRESS_FILL_MIN_WIDTH_RATIO = 16 / HUD_BASE_WIDTH;
const PROGRESS_STAR_SIZE_RATIO = 50 / HUD_BASE_WIDTH;
const PROGRESS_STAR_TOP_RATIO = 15 / HUD_BASE_HEIGHT;
const PROGRESS_STAR_THRESHOLDS = [0.1, 0.75, 1] as const;
const SCORE_VALUE_TOP_RATIO = 40 / HUD_BASE_HEIGHT;
const SCORE_VALUE_LEFT_RATIO = 320 / HUD_BASE_WIDTH;
const SCORE_VALUE_DIGITS = 5;
const SCORE_VALUE_NUMBER_HEIGHT_RATIO = 20 / HUD_BASE_HEIGHT;
const SCORE_VALUE_NUMBER_WIDTH_RATIO = 15 / HUD_BASE_WIDTH;
const SCORE_VALUE_NUMBER_GAP_RATIO = 2 / HUD_BASE_WIDTH;
const SCORE_VALUE_SPRITE_DIGITS = 10;
const MOVES_BAR_TOP_RATIO = -17 / HUD_BASE_HEIGHT;
const MOVES_BAR_LEFT_RATIO = 0 / HUD_BASE_WIDTH;
const MOVES_BAR_SIZE_RATIO = 140 / HUD_BASE_WIDTH;
const MOVES_NUMBER_TOP_RATIO = 38 / HUD_BASE_HEIGHT;
const MOVES_NUMBER_LEFT_RATIO = 32 / HUD_BASE_WIDTH;
const MOVES_NUMBER_HEIGHT_RATIO = 40 / HUD_BASE_HEIGHT;
const MOVES_NUMBER_GAP_RATIO = -3 / HUD_BASE_WIDTH;
const MOVES_NUMBER_WIDTH_RATIO = 40 / HUD_BASE_WIDTH;
const MOVES_NUMBER_SPRITE_DIGITS = 10;

const SETTINGS_BUTTON_TOP_RATIO = 0.02;
const SETTINGS_BUTTON_RIGHT_RATIO = 0.025;
const SETTINGS_BUTTON_SIZE_RATIO = 0.135;

const GRID_SIDE_MARGIN_RATIO = 0.003;
const GRID_TILE_GAP_RATIO = 0.0001;
const GRID_FRAME_VERTICAL_PADDING_RATIO = 0.020;
const GRID_BOTTOM_OFFSET_RATIO = 0.04;
const GRID_SIZE_BUDGET_BOTTOM_RATIO = 0.0009;
const GRID_HUD_GAP_PX = 0;
const GRID_BOARD_PADDING_RATIO = 0.003;
const GRID_FRAME_PADDING_RATIO = 0.003;
const GRID_INNER_FRAME_PADDING_RATIO = 0.003;
const GRID_CELL_AREA_PADDING_RATIO = 0.003;
const GRID_FRUIT_IMAGE_SCALE = 1.2;


const BOOSTER_BUTTON_SIZE_RATIO = 0.2;
const BOOSTER_BUTTON_GAP_RATIO = 0.01;
const SETTINGS_PANEL_WIDTH_RATIO = 0.88;
const SETTINGS_PANEL_HEIGHT_RATIO = 0.72;
const SETTINGS_EXIT_BUTTON_SIZE_RATIO = 64 / 520;
const SETTINGS_EXIT_BUTTON_TOP_RATIO = 170 / 760;
const SETTINGS_EXIT_BUTTON_RIGHT_RATIO = -5 / 520;
const SETTINGS_MENU_BUTTON_WIDTH_RATIO = 140 / 520;
const SETTINGS_MENU_BUTTON_HEIGHT_RATIO = 140 / 760;
const SETTINGS_MENU_BUTTON_GAP_RATIO = 0;

function roundPixels(value: number) {
  return Math.round(value);
}

function scaledDimension(value: number, fallback = 1) {
  return Math.max(fallback, roundPixels(value));
}

export function calculateLevelLayout({
  screenWidth,
  screenHeight,
  rows,
  cols,
}: LevelLayoutInput) {
  const settingsButtonSize = scaledDimension(screenWidth * SETTINGS_BUTTON_SIZE_RATIO, 44);
  const settingsButtonTop = roundPixels(screenHeight * SETTINGS_BUTTON_TOP_RATIO);
  const settingsButtonRight = roundPixels(screenWidth * SETTINGS_BUTTON_RIGHT_RATIO);

  const hudWidth = scaledDimension(screenWidth * HUD_WIDTH_RATIO);
  const hudScaleFactor = hudWidth / HUD_BASE_WIDTH;
  const hudHeight = scaledDimension(HUD_BASE_HEIGHT * hudScaleFactor);
  const hudTop = roundPixels(screenHeight * HUD_TOP_RATIO);
  const hudLeft = roundPixels((screenWidth - hudWidth) / 2 + screenWidth * HUD_LEFT_NUDGE_RATIO);
  const hudBottom = hudTop + hudHeight;

  const gridSideMargin = scaledDimension(screenWidth * GRID_SIDE_MARGIN_RATIO);
  const tileGap = scaledDimension(screenWidth * GRID_TILE_GAP_RATIO, 2);
  const boardPadding = scaledDimension(screenWidth * GRID_BOARD_PADDING_RATIO, 2);
  const framePadding = scaledDimension(screenWidth * GRID_FRAME_PADDING_RATIO, 2);
  const innerFramePadding = scaledDimension(screenWidth * GRID_INNER_FRAME_PADDING_RATIO, 2);
  const cellAreaPadding = scaledDimension(screenWidth * GRID_CELL_AREA_PADDING_RATIO, 2);
  const frameVerticalPadding = scaledDimension(screenWidth * GRID_FRAME_VERTICAL_PADDING_RATIO, 12);
  const gridBottomOffset = Math.max(0, roundPixels(screenHeight * GRID_BOTTOM_OFFSET_RATIO));
  const gridSizeBudgetBottomOffset = Math.max(0, roundPixels(screenHeight * GRID_SIZE_BUDGET_BOTTOM_RATIO));
  const boosterButtonSize = scaledDimension(screenWidth * BOOSTER_BUTTON_SIZE_RATIO, 56);
  const boosterButtonGap = scaledDimension(screenWidth * BOOSTER_BUTTON_GAP_RATIO, 6);
  const boardMaxWidthFromWidth = Math.max(
    0,
    screenWidth - gridSideMargin * 2 - framePadding * 2 - innerFramePadding * 2 - cellAreaPadding * 2,
  );
  const availableHeight =
    screenHeight - hudBottom - GRID_HUD_GAP_PX - gridSizeBudgetBottomOffset - boosterButtonSize - boosterButtonGap;
  const boardMaxWidthFromHeight =
    ((availableHeight - frameVerticalPadding - tileGap * (rows - 1)) / rows) * cols + tileGap * (cols - 1);
  const boardMaxWidth = scaledDimension(Math.min(boardMaxWidthFromWidth, boardMaxWidthFromHeight), cols * 24);
  const tileSize = Math.floor((boardMaxWidth - tileGap * (cols - 1)) / cols);
  const boardHeight = rows * tileSize + tileGap * (rows - 1) + frameVerticalPadding;
  const boardTop = hudBottom + GRID_HUD_GAP_PX;

  const scoreBarTop = roundPixels(hudHeight * SCORE_BAR_TOP_RATIO);
  const scoreBarLeft = roundPixels(hudWidth * SCORE_BAR_LEFT_RATIO);
  const scoreBarWidth = scaledDimension(hudWidth * SCORE_BAR_WIDTH_RATIO);
  const scoreBarHeight = scaledDimension(hudHeight * SCORE_BAR_HEIGHT_RATIO);
  const progressBarTop = roundPixels(hudHeight * PROGRESS_BAR_TOP_RATIO);
  const progressBarLeft = roundPixels(hudWidth * PROGRESS_BAR_LEFT_RATIO);
  const progressBarWidth = scaledDimension(hudWidth * PROGRESS_BAR_WIDTH_RATIO);
  const progressBarHeight = scaledDimension(hudHeight * PROGRESS_BAR_HEIGHT_RATIO);
  const progressFillTop = roundPixels(hudHeight * PROGRESS_FILL_TOP_RATIO);
  const progressFillLeft = roundPixels(hudWidth * PROGRESS_FILL_LEFT_RATIO);
  const progressFillWidth = scaledDimension(hudWidth * PROGRESS_FILL_WIDTH_RATIO);
  const progressFillMaxWidth = scaledDimension(hudWidth * PROGRESS_FILL_MAX_WIDTH_RATIO);
  const progressFillHeight = scaledDimension(hudHeight * PROGRESS_FILL_HEIGHT_RATIO, 6);
  const progressFillMinWidth = scaledDimension(hudWidth * PROGRESS_FILL_MIN_WIDTH_RATIO);
  const progressStarSize = scaledDimension(hudWidth * PROGRESS_STAR_SIZE_RATIO);
  const progressStarTop = roundPixels(hudHeight * PROGRESS_STAR_TOP_RATIO);
  const scoreValueTop = roundPixels(hudHeight * SCORE_VALUE_TOP_RATIO);
  const scoreValueLeft = roundPixels(hudWidth * SCORE_VALUE_LEFT_RATIO);
  const scoreValueNumberHeight = scaledDimension(hudHeight * SCORE_VALUE_NUMBER_HEIGHT_RATIO);
  const scoreValueNumberWidth = scaledDimension(hudWidth * SCORE_VALUE_NUMBER_WIDTH_RATIO);
  const scoreValueNumberGap = roundPixels(hudWidth * SCORE_VALUE_NUMBER_GAP_RATIO);
  const movesBarTop = roundPixels(hudHeight * MOVES_BAR_TOP_RATIO);
  const movesBarLeft = roundPixels(hudWidth * MOVES_BAR_LEFT_RATIO);
  const movesBarSize = scaledDimension(hudWidth * MOVES_BAR_SIZE_RATIO);
  const movesValueTop = roundPixels(hudHeight * MOVES_NUMBER_TOP_RATIO);
  const movesValueLeft = roundPixels(hudWidth * MOVES_NUMBER_LEFT_RATIO);
  const movesValueHeight = scaledDimension(hudHeight * MOVES_NUMBER_HEIGHT_RATIO);
  const movesValueWidth = scaledDimension(hudWidth * MOVES_NUMBER_WIDTH_RATIO);
  const movesValueGap = roundPixels(hudWidth * MOVES_NUMBER_GAP_RATIO);

  const settingsOverlayWidth = scaledDimension(screenWidth * SETTINGS_PANEL_WIDTH_RATIO);
  const settingsOverlayHeight = scaledDimension(screenHeight * SETTINGS_PANEL_HEIGHT_RATIO);

  return {
    boardMaxWidth,
    boardTop,
    gridBottomOffset,
    hudBottom,
    hudLeft,
    hudTop,
    minHudGap: GRID_HUD_GAP_PX,
    boosterButtonSize,
    boosterButtonGap,
    settingsButton: {
      top: settingsButtonTop,
      right: settingsButtonRight,
      size: settingsButtonSize,
    },
    hud: {
      top: hudTop,
      left: hudLeft,
      width: hudWidth,
      height: hudHeight,
      scoreBar: {
        top: scoreBarTop,
        left: scoreBarLeft,
        width: scoreBarWidth,
        height: scoreBarHeight,
      },
      progressBar: {
        top: progressBarTop,
        left: progressBarLeft,
        width: progressBarWidth,
        height: progressBarHeight,
      },
      progressFill: {
        top: progressFillTop,
        left: progressFillLeft,
        width: progressFillWidth,
        maxWidth: progressFillMaxWidth,
        minWidth: progressFillMinWidth,
        height: progressFillHeight,
      },
      progressStars: {
        top: progressStarTop,
        size: progressStarSize,
        thresholds: PROGRESS_STAR_THRESHOLDS,
      },
      scoreValue: {
        top: scoreValueTop,
        left: scoreValueLeft,
        digits: SCORE_VALUE_DIGITS,
        numberHeight: scoreValueNumberHeight,
        numberWidth: scoreValueNumberWidth,
        numberGap: scoreValueNumberGap,
        spriteDigits: SCORE_VALUE_SPRITE_DIGITS,
      },
      movesBar: {
        top: movesBarTop,
        left: movesBarLeft,
        size: movesBarSize,
      },
      movesValue: {
        top: movesValueTop,
        left: movesValueLeft,
        height: movesValueHeight,
        width: movesValueWidth,
        gap: movesValueGap,
        spriteDigits: MOVES_NUMBER_SPRITE_DIGITS,
      },
    },
    grid: {
      boardMaxWidth,
      screenPadding: 0,
      sideMargin: gridSideMargin,
      tileGap,
      boardPadding,
      framePadding,
      innerFramePadding,
      cellAreaPadding,
      fruitImageScale: GRID_FRUIT_IMAGE_SCALE,
      bottomOffset: gridBottomOffset,
      boardTop,
    },
    boosters: {
      buttonSize: boosterButtonSize,
      gap: boosterButtonGap,
    },
    settingsOverlay: {
      width: settingsOverlayWidth,
      height: settingsOverlayHeight,
      exitButtonSize: scaledDimension(settingsOverlayWidth * SETTINGS_EXIT_BUTTON_SIZE_RATIO),
      exitButtonTop: roundPixels(settingsOverlayHeight * SETTINGS_EXIT_BUTTON_TOP_RATIO),
      exitButtonRight: roundPixels(settingsOverlayWidth * SETTINGS_EXIT_BUTTON_RIGHT_RATIO),
      menuButtonWidth: scaledDimension(settingsOverlayWidth * SETTINGS_MENU_BUTTON_WIDTH_RATIO),
      menuButtonHeight: scaledDimension(settingsOverlayHeight * SETTINGS_MENU_BUTTON_HEIGHT_RATIO),
      menuButtonGap: roundPixels(settingsOverlayWidth * SETTINGS_MENU_BUTTON_GAP_RATIO),
    },
  };
}
