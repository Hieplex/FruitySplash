import { describe, expect, it } from 'vitest';

import { calculateLevelLayout } from '@/gameplay/level-layout';

describe('level layout', () => {
  it('keeps the board sized responsively on short screens', () => {
    const layout = calculateLevelLayout({
      screenWidth: 480,
      screenHeight: 900,
      rows: 8,
      cols: 6,
    });

    expect(layout.boardMaxWidth).toBeGreaterThan(390);
    expect(layout.boardMaxWidth).toBeLessThanOrEqual(480);
    expect(layout.boardTop).toBeGreaterThan(0);
  });

  it('keeps the wide-screen cap when height has enough room', () => {
    const compact = calculateLevelLayout({
      screenWidth: 380,
      screenHeight: 1100,
      rows: 8,
      cols: 6,
    });
    const layout = calculateLevelLayout({
      screenWidth: 480,
      screenHeight: 1100,
      rows: 8,
      cols: 6,
    });

    expect(layout.boardMaxWidth).toBeGreaterThan(compact.boardMaxWidth);
    expect(layout.boardMaxWidth).toBeLessThanOrEqual(480);
  });

  it('scales the HUD width with the active screen width', () => {
    const compact = calculateLevelLayout({
      screenWidth: 380,
      screenHeight: 900,
      rows: 8,
      cols: 6,
    });
    const roomy = calculateLevelLayout({
      screenWidth: 520,
      screenHeight: 900,
      rows: 8,
      cols: 6,
    });

    expect(roomy.hud.width).toBeGreaterThan(compact.hud.width);
    expect(roomy.settingsButton.size).toBeGreaterThan(compact.settingsButton.size);
  });
});
