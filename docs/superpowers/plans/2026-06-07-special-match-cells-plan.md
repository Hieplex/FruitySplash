# Special Match Cells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build special cells for match 4, 5, 6, and 7 so matched fruit visually pull into one powered cell, then that cell can wipe a full row or column when activated.

**Architecture:** Keep match rules deterministic in `src/game/*`, convert match results into visual events in `src/gameplay/*`, and render merge/wipe effects in board layers. The engine should decide what special cell is created and what it clears; the React components should only animate declared events.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Vitest.

---

## Current Context

- Boards are currently `8 x 6`, so match 7 can happen vertically but not horizontally unless board dimensions change later.
- `src/game/match.ts` already detects runs of `3+` and now exposes `size` and `tier`.
- `src/game/engine.ts` resolves full cascades deterministically and emits timeline events.
- `app/level/[id].tsx` runs visual jobs through `CascadeSequenceJob`.
- `src/components/game-board.tsx` owns board overlays, drop animations, bomb/hammer effects, and splash effects.

## Intended Gameplay Rules

- Match 3: normal clear.
- Match 4: matched cells pull into one special cell that wipes one row or one column.
- Match 5: creates a stronger row/column special cell; for v1 it can still wipe one row/column but should carry a higher `powerTier` for future art/scoring.
- Match 6: same activation model, stronger tier metadata.
- Match 7+: same activation model, clamped to tier 7.
- Horizontal long match creates a row-wipe special cell.
- Vertical long match creates a column-wipe special cell.
- The special cell is placed at the moved cell when a swap created the match; otherwise use the center-most cell of the match.
- The special cell activates when it is part of a later match or is directly swapped with another cell.
- Activation clears the full target row or column, then normal collapse/refill/cascade continues.

## File Structure

- Modify `src/game/types.ts`: add special-cell board types and special-clear timeline events.
- Modify `src/game/match.ts`: keep match tier helpers; add special creation metadata helpers.
- Modify `src/game/engine.ts`: create special cells during long matches, preserve them on the board, and activate them.
- Create `src/game/special-cells.ts`: pure helpers for choosing special cell placement, deciding direction, and computing row/column clear cells.
- Modify `src/game/gravity.ts`: allow board cells to be fruit or special cells without losing fruit identity.
- Modify `src/gameplay/match-cascade.ts`: convert special creation and activation events into visual jobs.
- Create `src/components/special-cell-layer.tsx`: render pull-merge and row/column wipe effects.
- Modify `src/components/fruit-tile.tsx`: render a special-cell visual state over the fruit.
- Modify `src/components/game-board.tsx`: wire special-cell overlay animations.
- Modify tests in `tests/game`, `tests/gameplay`, and `tests/components`.

---

## Task 1: Add Special Cell Types

**Files:**
- Modify: `src/game/types.ts`
- Create: `tests/game/special-cells.test.ts`

- [ ] **Step 1: Write failing type-level and helper tests**

Add `tests/game/special-cells.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  getSpecialCellClearCells,
  getSpecialCellKindForMatch,
  pickSpecialCellPosition,
} from '../../src/game/special-cells';
import type { MatchGroup } from '../../src/game/types';

const rowMatch4: MatchGroup = {
  axis: 'row',
  fruit: 2,
  size: 4,
  tier: 4,
  cells: [
    { row: 3, col: 1 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
    { row: 3, col: 4 },
  ],
};

describe('special cells', () => {
  it('creates row wipe specials from horizontal long matches', () => {
    expect(getSpecialCellKindForMatch(rowMatch4)).toEqual({
      kind: 'row-wipe',
      powerTier: 4,
      fruit: 2,
    });
  });

  it('places the special on the moved cell when it belongs to the match', () => {
    expect(pickSpecialCellPosition(rowMatch4, { row: 3, col: 4 })).toEqual({ row: 3, col: 4 });
  });

  it('clears a full row for row wipe specials', () => {
    expect(getSpecialCellClearCells({ row: 2, col: 3 }, 'row-wipe', 8, 6)).toEqual([
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `rtk npx vitest run tests/game/special-cells.test.ts`

Expected: fail because `src/game/special-cells.ts` does not exist.

- [ ] **Step 3: Implement types and helpers**

In `src/game/types.ts`, change board cells from bare fruit numbers to a union:

```ts
export type SpecialCellKind = 'row-wipe' | 'column-wipe';

export type NormalCell = {
  type: 'fruit';
  fruit: Fruit;
};

export type SpecialCell = {
  type: 'special';
  fruit: Fruit;
  kind: SpecialCellKind;
  powerTier: MatchTier;
};

export type BoardCell = NormalCell | SpecialCell;
```

To avoid a huge migration in this task, add adapter helpers and keep `Board = Fruit[][]` until Task 2. In `src/game/special-cells.ts`:

```ts
import type { MatchGroup, MatchTier, Position, SpecialCellKind } from './types';

export function getSpecialCellKindForMatch(match: MatchGroup): {
  kind: SpecialCellKind;
  powerTier: MatchTier;
  fruit: number;
} | null {
  if (match.tier < 4) return null;

  return {
    kind: match.axis === 'row' ? 'row-wipe' : 'column-wipe',
    powerTier: match.tier,
    fruit: match.fruit,
  };
}

export function pickSpecialCellPosition(match: MatchGroup, movedCell?: Position): Position {
  if (movedCell && match.cells.some((cell) => cell.row === movedCell.row && cell.col === movedCell.col)) {
    return movedCell;
  }

  return match.cells[Math.floor((match.cells.length - 1) / 2)];
}

export function getSpecialCellClearCells(
  origin: Position,
  kind: SpecialCellKind,
  rows: number,
  cols: number,
): Position[] {
  if (kind === 'row-wipe') {
    return Array.from({ length: cols }, (_, col) => ({ row: origin.row, col }));
  }

  return Array.from({ length: rows }, (_, row) => ({ row, col: origin.col }));
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `rtk npx vitest run tests/game/special-cells.test.ts`

Expected: pass.

---

## Task 2: Migrate Board Cells Without Breaking Existing Gameplay

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/board.ts`
- Modify: `src/game/match.ts`
- Modify: `src/game/gravity.ts`
- Modify: existing tests in `tests/game/*.test.ts`

- [ ] **Step 1: Write failing compatibility tests**

Add tests proving `createBoardFromRows` still accepts number rows and that `findMatches` still sees fruit values:

```ts
it('wraps numeric fixtures as normal fruit cells', () => {
  const board = createBoardFromRows([
    [0, 0, 0, 1, 2, 3],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
  ]);

  expect(findMatches(board)[0]).toMatchObject({
    axis: 'row',
    fruit: 0,
    size: 3,
    tier: 3,
  });
});
```

- [ ] **Step 2: Run compatibility tests and verify RED**

Run: `rtk npx vitest run tests/game/board.test.ts tests/game/match.test.ts`

Expected: fail until board helpers support cell objects.

- [ ] **Step 3: Implement board-cell adapters**

Add in `src/game/board.ts`:

```ts
export function createFruitCell(fruit: Fruit): NormalCell {
  return { type: 'fruit', fruit };
}

export function getCellFruit(cell: BoardCell): Fruit {
  return cell.fruit;
}

export function isSpecialCell(cell: BoardCell): cell is SpecialCell {
  return cell.type === 'special';
}
```

Change `createBoardFromRows` and `createBoard` to return `BoardCell[][]` internally while preserving the same call shape.

- [ ] **Step 4: Update match/gravity to use `getCellFruit`**

Replace direct comparisons like `board[row][col] === fruit` with `getCellFruit(board[row][col]) === fruit`.

- [ ] **Step 5: Run all game tests**

Run: `rtk npx vitest run tests/game`

Expected: pass.

---

## Task 3: Create Special Cells From Long Matches

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/types.ts`
- Test: `tests/game/engine.test.ts`

- [ ] **Step 1: Write failing engine tests**

Add a test where a swap creates match 4 and leaves one row-wipe special cell at the swapped destination:

```ts
it('turns a match 4 into one row wipe special cell', () => {
  const board = createBoardFromRows([
    [0, 1, 2, 3, 4, 0],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0],
    [1, 2, 3, 4, 0, 1],
    [0, 0, 0, 3, 0, 4],
  ]);

  const result = resolveSwap(
    { board, score: 0, movesUsed: 0 },
    { from: { row: 7, col: 3 }, to: { row: 7, col: 4 } },
    { refill: createQueueRefill([1, 2, 3]) },
  );

  expect(result.board[7][4]).toEqual({
    type: 'special',
    fruit: 0,
    kind: 'row-wipe',
    powerTier: 4,
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `rtk npx vitest run tests/game/engine.test.ts`

Expected: fail because long matches clear all cells today.

- [ ] **Step 3: Preserve special target during clear**

In `resolveBoardMatches`, when a long match creates a special cell:

1. Choose the special position with `pickSpecialCellPosition`.
2. Clear all matched cells except that position.
3. Put the special cell at that position before collapse.
4. Emit a `special-create` timeline event with source cells and target cell.

- [ ] **Step 4: Run engine tests**

Run: `rtk npx vitest run tests/game/engine.test.ts tests/game/match.test.ts`

Expected: pass.

---

## Task 4: Activate Special Cells

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/special-cells.ts`
- Test: `tests/game/engine.test.ts`

- [ ] **Step 1: Write failing activation tests**

Add tests:

```ts
it('activates a row wipe special when swapped', () => {
  const board = createBoardFromRows([
    [0, 1, 2, 3, 4, 0],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
  ]);

  board[3][2] = { type: 'special', fruit: 4, kind: 'row-wipe', powerTier: 4 };

  const result = resolveSwap(
    { board, score: 0, movesUsed: 0 },
    { from: { row: 3, col: 2 }, to: { row: 3, col: 3 } },
    { refill: createQueueRefill([1, 2, 3, 4, 0, 1]) },
  );

  expect(result.clearedCells).toBeGreaterThanOrEqual(6);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `rtk npx vitest run tests/game/engine.test.ts`

Expected: fail because special cells do not activate yet.

- [ ] **Step 3: Implement activation before normal match validation**

If either swapped cell is special:

1. Accept the move.
2. Compute row/column cells.
3. Clear those cells.
4. Collapse/refill.
5. Resolve cascades.
6. Emit `special-activate` and `special-wipe` timeline events.

- [ ] **Step 4: Run engine tests**

Run: `rtk npx vitest run tests/game/engine.test.ts`

Expected: pass.

---

## Task 5: Add Visual Jobs For Pull-Merge And Wipe

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/gameplay/match-cascade.ts`
- Test: `tests/gameplay/match-cascade.test.ts`

- [ ] **Step 1: Add failing timeline conversion tests**

Test that `special-create` becomes a `special-merge` job and `special-wipe` becomes a `special-wipe` job.

- [ ] **Step 2: Run and verify RED**

Run: `rtk npx vitest run tests/gameplay/match-cascade.test.ts`

Expected: fail because visual jobs do not exist.

- [ ] **Step 3: Add visual job types**

Extend `CascadeSequenceJob`:

```ts
| {
    type: 'special-merge';
    key: number;
    board: Board;
    fruit: Fruit;
    sourceCells: Position[];
    targetCell: Position;
    special: SpecialCell;
  }
| {
    type: 'special-wipe';
    key: number;
    board: Board;
    origin: Position;
    kind: SpecialCellKind;
    cells: Position[];
  }
```

- [ ] **Step 4: Convert engine timeline events into jobs**

Update `createCascadeSequenceJobsFromTimeline` to map special events into these new job types.

- [ ] **Step 5: Run gameplay tests**

Run: `rtk npx vitest run tests/gameplay`

Expected: pass.

---

## Task 6: Render Special Cells And Effects

**Files:**
- Modify: `src/components/fruit-tile.tsx`
- Create: `src/components/special-cell-layer.tsx`
- Modify: `src/components/game-board.tsx`
- Test: `tests/components/special-cell-layer.test.ts`

- [ ] **Step 1: Add render-plan tests**

Create pure helpers if needed:

```ts
expect(createSpecialMergePlan({
  sourceCells: [{ row: 2, col: 1 }, { row: 2, col: 2 }],
  targetCell: { row: 2, col: 3 },
})).toMatchObject({
  targetCell: { row: 2, col: 3 },
  sourceCount: 2,
});
```

- [ ] **Step 2: Run and verify RED**

Run: `rtk npx vitest run tests/components/special-cell-layer.test.ts`

Expected: fail because helper/layer does not exist.

- [ ] **Step 3: Implement `SpecialCellLayer`**

Visual behavior:

1. Merge phase: matched cells scale down and translate toward target cell.
2. Birth phase: target cell pulses and flashes with row/column marker.
3. Wipe phase: horizontal or vertical beam sweeps across the row/column.

- [ ] **Step 4: Wire into `GameBoard`**

Add props:

```ts
specialMergeAnimation?: SpecialMergeAnimation | null;
specialWipeAnimation?: SpecialWipeAnimation | null;
onSpecialMergeComplete?: (key: number) => void;
onSpecialWipeComplete?: (key: number) => void;
```

- [ ] **Step 5: Run component and type checks**

Run:

```powershell
rtk npx vitest run tests/components
rtk npm run typecheck
```

Expected: pass.

---

## Task 7: Wire Level Screen Sequencing

**Files:**
- Modify: `app/level/[id].tsx`
- Modify: `src/gameplay/interaction.ts`
- Test: `tests/gameplay/interaction.test.ts`

- [ ] **Step 1: Write failing lock-state test**

Special merge and special wipe animations should lock board input just like splash/drop/bomb.

- [ ] **Step 2: Run and verify RED**

Run: `rtk npx vitest run tests/gameplay/interaction.test.ts`

Expected: fail until new lock flags are added.

- [ ] **Step 3: Add level state**

Add:

```ts
const [specialMergeAnimation, setSpecialMergeAnimation] = useState<SpecialMergeAnimation | null>(null);
const [specialWipeAnimation, setSpecialWipeAnimation] = useState<SpecialWipeAnimation | null>(null);
```

Update `applyTimelineJob` and `advanceTimeline` to start/complete special jobs.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
rtk npx vitest run tests/gameplay/interaction.test.ts tests/gameplay/match-cascade.test.ts
```

Expected: pass.

---

## Task 8: Final Verification And Live QA

**Files:**
- Modify: `TODO.md` only if the team wants the completed item recorded.

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
rtk npm run typecheck
rtk npm test
rtk npm run verify:levels
```

Expected:

- TypeScript passes.
- All Vitest tests pass.
- 120 levels verify successfully.

- [ ] **Step 2: Live visual QA**

Run the app and verify:

- Match 4 pulls into one special cell.
- Match 5 pulls into one special cell.
- Match 6 pulls into one special cell.
- Vertical match 7 pulls into one special cell.
- Row special wipes exactly one row.
- Column special wipes exactly one column.
- Cascades continue after wipe.
- Bomb and hammer still run without hidden-cell flashes.

---

## Self-Review

- Spec coverage: plan covers special-cell creation, merge animation, row/column wipe activation, cascade continuation, and tests.
- Placeholder scan: no `TBD`/`TODO` placeholders are used for implementation steps.
- Type consistency: `SpecialCellKind`, `SpecialCell`, `CascadeSequenceJob`, and animation prop names are introduced before later tasks use them.
