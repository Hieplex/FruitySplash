import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('hammer booster toolbar visibility', () => {
  it('keeps the hammer implementation parked while hiding its gameplay button', () => {
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');
    const boardToolButtonsStart = levelScreen.indexOf('const boardToolButtons');
    const boardToolButtonsEnd = levelScreen.indexOf('];', boardToolButtonsStart);
    const boardToolButtons = levelScreen.slice(boardToolButtonsStart, boardToolButtonsEnd);

    expect(boardToolButtons).not.toContain("id: 'hammer'");
    expect(boardToolButtons).not.toContain('Hammer booster');
    expect(levelScreen).toContain("selectedBoardTool === 'hammer'");
  });
});
