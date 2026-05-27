import { describe, expect, it } from 'vitest';

import { calculateLevelLayout } from '@/gameplay/level-layout';

describe('level layout', () => {
  it('shrinks the board on short screens so it stays below the HUD', () => {
    const layout = calculateLevelLayout({
      screenWidth: 480,
      screenHeight: 900,
      rows: 8,
      cols: 6,
    });

    expect(layout.boardMaxWidth).toBeLessThan(390);
    expect(layout.boardTop).toBeGreaterThanOrEqual(layout.hudBottom + layout.minHudGap);
  });

  it('keeps the wide-screen cap when height has enough room', () => {
    const layout = calculateLevelLayout({
      screenWidth: 480,
      screenHeight: 1100,
      rows: 8,
      cols: 6,
    });

    expect(layout.boardMaxWidth).toBe(390);
  });

  it('moves the HUD, grid, and booster as one vertical group', () => {
    const base = calculateLevelLayout({
      screenWidth: 480,
      screenHeight: 1100,
      rows: 8,
      cols: 6,
    });
    const moved = calculateLevelLayout({
      screenWidth: 480,
      screenHeight: 1100,
      rows: 8,
      cols: 6,
      groupYOffset: 24,
    });

    expect(moved.hudBottom - base.hudBottom).toBe(24);
    expect(moved.boardTop - base.boardTop).toBe(24);
    expect(moved.gridBottomOffset).toBe(base.gridBottomOffset - 24);
  });
});
