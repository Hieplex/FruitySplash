type LevelLayoutInput = {
  screenWidth: number;
  screenHeight: number;
  rows: number;
  cols: number;
  groupYOffset?: number;
};

// Change this one value to move the HUD, grid, and booster button together.
// Positive values move the full gameplay group down; negative values move it up.
const GAMEPLAY_GROUP_Y_OFFSET = 0;
const HUD_TOP = 80;
const HUD_WIDTH = 440;
const HUD_HEIGHT = 125;
const HUD_SIDE_MARGIN = 8;
const HUD_LEFT = -15;
const GRID_MAX_WIDTH = 390;
const GRID_SIDE_MARGIN = 14;
const GRID_TILE_GAP = 4;
const GRID_FRAME_VERTICAL_PADDING = 24;
const GRID_BOTTOM_OFFSET = 70;
const BOOSTER_BUTTON_SIZE = 94;
const BOOSTER_BUTTON_GAP = 10;
const MIN_HUD_GAP = 18;
const ABSOLUTE_MIN_BOARD_WIDTH = 390;

export function calculateLevelLayout({
  screenWidth,
  screenHeight,
  rows,
  cols,
  groupYOffset = GAMEPLAY_GROUP_Y_OFFSET,
}: LevelLayoutInput) {
  const hudTop = HUD_TOP + groupYOffset;
  const gridBottomOffset = Math.max(0, GRID_BOTTOM_OFFSET - groupYOffset);
  const hudScale = Math.min(1, (screenWidth - HUD_SIDE_MARGIN * 2) / HUD_WIDTH);
  const hudLeft = (screenWidth - HUD_WIDTH * hudScale) / 2 + HUD_LEFT * hudScale;
  const hudBottom = hudTop + HUD_HEIGHT * hudScale;
  const widthCap = Math.min(GRID_MAX_WIDTH, screenWidth - GRID_SIDE_MARGIN * 2);
  const availableHeight =
    screenHeight - hudBottom - MIN_HUD_GAP - gridBottomOffset - BOOSTER_BUTTON_SIZE - BOOSTER_BUTTON_GAP;
  const maxBoardFromHeight =
    ((availableHeight - GRID_FRAME_VERTICAL_PADDING - GRID_TILE_GAP * (rows - 1)) / rows) * cols +
    GRID_TILE_GAP * (cols - 1);
  const boardMaxWidth = Math.max(ABSOLUTE_MIN_BOARD_WIDTH, Math.floor(Math.min(widthCap, maxBoardFromHeight)));
  const tileSize = Math.floor((boardMaxWidth - GRID_TILE_GAP * (cols - 1)) / cols);
  const boardHeight = rows * tileSize + GRID_TILE_GAP * (rows - 1) + GRID_FRAME_VERTICAL_PADDING;
  const boardTop = screenHeight - gridBottomOffset - BOOSTER_BUTTON_SIZE - BOOSTER_BUTTON_GAP - boardHeight;

  return {
    boardMaxWidth,
    gridBottomOffset,
    boardTop,
    boosterButtonSize: BOOSTER_BUTTON_SIZE,
    boosterButtonGap: BOOSTER_BUTTON_GAP,
    hudBottom,
    hudLeft,
    hudScale,
    minHudGap: MIN_HUD_GAP,
  };
}
