# Fruity Splash Cascade Animation Refactor Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make gameplay cascades feel much more alive and premium, closer to Candy Crush-style responsiveness, while preserving deterministic board logic and existing game rules.

**Why This Plan Exists:** The current gameplay flow resolves whole cascades up front and then presents them as sequential board-wide phases. That makes Fruity Splash feel more locked and stage-based than premium match-3 games, where columns and tiles appear to keep moving independently.

**Current Verified Constraints:**
- `src/game/engine.ts` resolves full cascades in a board-wide `while` loop before the visual flow finishes.
- `src/gameplay/match-cascade.ts` packages each chain as one `MatchStep` with one splash plus one drop batch.
- `app/level/[id].tsx` sequences `match board -> splash -> settled board -> drop -> next step`.
- `src/components/game-board.tsx` uses one shared `dropProgress` for the entire active drop batch.
- `src/components/game-board-layers.tsx` renders all current drop motions in one overlay phase.
- `src/game/gravity.ts` already computes drop motions per column, which gives us a good base for a more granular visual system.

**Target Outcome:** Keep the deterministic engine, but present cascades through finer-grained animation jobs so columns and tiles can feel more independent, more overlapping, and less globally blocked.

---

## Architecture Direction

**Keep:**
- Deterministic board logic in `src/game/engine.ts`
- Column-aware gravity output from `src/game/gravity.ts`
- Existing score/match correctness rules
- Existing swap/booster game rules

**Change:**
- Stop treating each cascade chain as a single splash phase plus a single drop phase
- Stop driving all drops from one board-wide `Animated.Value`
- Stop advancing the next chain only after a fully global drop-complete event
- Replace coarse board snapshot handoffs with finer animation jobs

**Preferred Strategy:** Introduce an intermediate visual timeline layer rather than rewriting core match logic first.

That means:
1. Compute logic deterministically as we do today
2. Convert logic results into a sequence of visual jobs
3. Let the visual layer schedule those jobs with per-column/per-tile timing
4. Only rewrite engine granularity later if the visual layer alone is not enough

---

## Planned File Changes

**Modify:**
- `src/game/engine.ts`
- `src/game/gravity.ts`
- `src/game/types.ts`
- `src/gameplay/match-cascade.ts`
- `src/components/game-board.tsx`
- `src/components/game-board-layers.tsx`
- `app/level/[id].tsx`
- `tests/gameplay/match-cascade.test.ts`
- `tests/game/engine.test.ts`

**Create:**
- `src/gameplay/cascade-timeline.ts`
- `tests/gameplay/cascade-timeline.test.ts`

---

## Phase 1: Isolate Visual Timeline From Game Logic

**Goal:** Build a visual timeline abstraction without changing match rules yet.

- [ ] **Step 1: Add explicit visual event types**

Create timeline-friendly event types for:
- clear jobs
- drop jobs
- spawn jobs
- reshuffle jobs
- optional column grouping metadata

Expected: we can represent one cascade as animation-ready jobs instead of only whole-board snapshots.

- [ ] **Step 2: Create `src/gameplay/cascade-timeline.ts`**

Build a transformer that takes current cascade outputs and emits visual jobs in the order the UI should play them.

Expected: one place owns animation sequencing decisions instead of `app/level/[id].tsx`.

- [ ] **Step 3: Add tests for timeline generation**

Create `tests/gameplay/cascade-timeline.test.ts` covering:
- simple single match
- multi-column drop
- multi-chain cascade
- spawned fruit motions

Expected: visual job generation is deterministic and testable.

---

## Phase 2: Replace Board-Wide Drop Progress With Granular Motion

**Goal:** Make drops feel more independent without rewriting board logic yet.

- [ ] **Step 4: Refactor `DropLayer` to support per-motion timing**

Change `src/components/game-board-layers.tsx` so each `DropMotion` can animate with its own start delay and duration rather than sharing one global drop progress curve.

Expected: columns with shorter/faster movement no longer wait visually for the slowest motion.

- [ ] **Step 5: Refactor `GameBoard` drop orchestration**

In `src/components/game-board.tsx`, replace the single `dropProgress` flow with a motion batch model that can:
- track per-motion completion
- resolve a batch when all relevant motions finish
- support staggered starts by column or distance

Expected: the board still behaves correctly, but feels less globally locked.

- [ ] **Step 6: Preserve hidden-cell correctness**

Re-check how `dropHiddenCells`, `matchDisplayBoard`, and overlay layers interact so we do not reintroduce duplicate fruit or missing fruit artifacts.

Expected: better motion feel without visual regressions.

---

## Phase 3: Break MatchStep Into Finer Visual Units

**Goal:** Stop presenting each cascade chain as one splash phase plus one drop phase.

- [ ] **Step 7: Expand `MatchStep` shape in `src/gameplay/match-cascade.ts`**

Instead of returning only:
- `board`
- `settledBoard`
- `dropMotions`
- `splash`

return richer visual information such as:
- affected columns
- spawned fruit
- drop groups
- clear cells by cluster or wave

Expected: UI can stage more nuanced motion from the same deterministic result.

- [ ] **Step 8: Move sequencing responsibility out of `app/level/[id].tsx`**

Replace the current manual phase flow in the level route with a smaller orchestrator that consumes timeline jobs.

Expected: the level screen becomes thinner and less phase-coupled.

---

## Phase 4: Add Overlap And Premium Feel

**Goal:** Make the board feel continuously alive.

- [ ] **Step 9: Introduce overlap between clear and drop presentation**

Allow drop motions in unaffected columns to begin slightly before every splash animation has fully cleared, when visually safe.

Expected: less “the whole board waits” feeling.

- [ ] **Step 10: Add column-based staggering**

Use simple stagger rules such as:
- earlier start for shorter drops
- per-column offsets
- per-distance duration

Expected: columns feel naturally independent even though logic remains deterministic.

- [ ] **Step 11: Tune for readability**

Tune timings so the board feels fast but still readable:
- splash duration
- drop start delay
- spawn easing
- overlap window

Expected: premium feel without making cascades visually confusing.

---

## Optional Phase 5: Engine-Level Granularity Upgrade

**Goal:** Only if needed, move from precomputed board-wide cascades to more incremental engine reporting.

- [ ] **Step 12: Evaluate whether visual-job layering is enough**

If the board still feels too global after Phases 1-4, consider changing `resolveBoardMatches` to emit intermediate column-aware resolution events instead of only full-chain `onScore` events.

Expected: we avoid risky engine changes unless the visual-layer refactor proves insufficient.

---

## Risks

- Hidden/display board handoff may reintroduce duplicate fruit artifacts if overlays and base board are not synchronized carefully.
- Overlap can make the board feel messy if clear and drop timing are too aggressive.
- Booster flows (`bomb`, `hammer`) currently reuse the same chain/step model and will need the new timeline path too.
- Reshuffle handling is currently a distinct global phase and may still feel coarse unless included in the new timeline model.

---

## Verification Plan

- [ ] Unit-test timeline generation for multi-chain cascades
- [ ] Unit-test that per-motion/per-column batches complete deterministically
- [ ] Playtest swap, cascade, bomb, hammer, and reshuffle paths
- [ ] Visually confirm that unaffected columns can appear active sooner
- [ ] Confirm no duplicate fruit, invisible fruit, or stale hidden-cell artifacts

---

## Recommended Implementation Order

1. Build `cascade-timeline.ts`
2. Upgrade `DropLayer` and `GameBoard` to granular motion batches
3. Refactor `match-cascade.ts` to emit richer visual job data
4. Simplify `app/level/[id].tsx` orchestration around the new timeline
5. Tune overlaps and timings
6. Only then decide whether engine-level granularity needs to change

---

## Definition Of Done

- Cascades no longer feel like one locked global board phase
- Drop motions feel more independent by column/tile group
- The level route no longer manually sequences every board-wide animation phase
- Bomb and hammer follow the same improved visual system
- Tests cover timeline conversion and cascade job ordering
- Gameplay remains deterministic and bug-free
