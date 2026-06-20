import { describe, expect, it } from 'vitest';

import {
  buildSpecialMergeHiddenCellKeys,
  buildSpecialWipeHiddenCellKeys,
  cellKey,
} from '@/components/game-board-visibility';

describe('game board visibility', () => {
  it('hides the special merge target with the merged source cells', () => {
    const hidden = buildSpecialMergeHiddenCellKeys({
      sourceCells: [
        { row: 7, col: 0 },
        { row: 7, col: 1 },
        { row: 7, col: 2 },
      ],
      targetCell: { row: 7, col: 3 },
      colCount: 6,
    });

    expect(hidden).toEqual(
      new Set([
        cellKey(7, 0, 6),
        cellKey(7, 1, 6),
        cellKey(7, 2, 6),
        cellKey(7, 3, 6),
      ]),
    );
  });

  it('hides normal special wipe cells while keeping Lightning root cells owned by Lightning', () => {
    const hidden = buildSpecialWipeHiddenCellKeys({
      colCount: 6,
      wipes: [
        {
          sourceTool: 'lightningFruits',
          cells: [
            { row: 0, col: 2 },
            { row: 1, col: 2 },
          ],
        },
        {
          cells: [
            { row: 1, col: 0 },
            { row: 1, col: 1 },
            { row: 1, col: 2 },
          ],
        },
        {
          previewOnly: true,
          cells: [{ row: 2, col: 3 }],
        },
      ],
    });

    expect(hidden).toEqual(new Set([cellKey(1, 0, 6), cellKey(1, 1, 6), cellKey(1, 2, 6)]));
  });
});
