import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../..');

describe('overlapped drop wiring', () => {
  it('keeps overlapped drops visible until their primary timeline job completes', () => {
    const levelScreen = readFileSync(path.join(projectRoot, 'app/level/[id].tsx'), 'utf8');
    const start = levelScreen.indexOf('function handleDropAnimationComplete');
    const end = levelScreen.indexOf('function handleReshuffleAnimationComplete', start);
    const handler = levelScreen.slice(start, end);

    expect(handler.indexOf('completeOverlappedDrop(key)')).toBeGreaterThan(-1);
    expect(handler.indexOf('setDropAnimation((current)')).toBeGreaterThan(-1);
    expect(handler.indexOf('completeOverlappedDrop(key)')).toBeLessThan(
      handler.indexOf('setDropAnimation((current)'),
    );
  });
});
