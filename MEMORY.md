# FruitySplash Level Design Architecture Memory

Last updated: 2026-06-20

This file is the project memory for Match-3 level design direction. It compares the current FruitySplash level system with mature Match-3 design patterns and defines the future 1-200 level architecture.

## Where FruitySplash Is Right Now

The current game has a strong core loop, but the level design layer is still mostly numeric balancing rather than full Match-3 content design.

Current implemented strengths:

- Deterministic match-3 board engine with swaps, cascades, scoring, gravity, refills, reshuffle, and special cells.
- Score-based win condition. A level is won when `score >= targetScore`.
- Star thresholds already follow the requested ten-level growth model:
  - Levels 1-10: `2750 / 3550 / 4550`.
  - Each next 10-level block multiplies the previous block by `1.1`, rounded to the nearest 50.
  - `targetScore` currently equals the 3-star threshold.
- Move curve exists:
  - Levels 1-5 use 50 moves.
  - Levels 6-190 interpolate from 49 moves down to 20 moves.
  - Levels 191+ use 15 moves.
  - Important: the current catalog only generates 120 levels, so the 190-200 move behavior is coded but not reachable yet.
- Four current difficulty bands:
  - `gentle-onboarding`: levels 1-20.
  - `rising-pressure`: levels 21-50.
  - `tighter-timer`: levels 51-80.
  - `hard-release`: levels 81-120.
- Current board is fixed at 8 rows x 6 columns with 5 fruit types.
- Current special-cell mapping:
  - Match 4: row or column wipe, based on match axis.
  - Match 5 and 6: cross wipe.
  - Match 7+: color clear.
- Current score math:
  - Base points: `matchedCellCount * 10`.
  - Tier bonuses: match 4 = +20, match 5 = +50, match 6 = +90, match 7 = +140.
  - Cascades multiply match score by cascade count.
- Economy foundation exists:
  - Coins.
  - Energy.
  - Booster inventory.
  - Supabase RPC paths for buying boosters, consuming boosters, spending energy, and claiming completion rewards.

Current missing level-design systems:

- No board topology yet: no board masks, dead zones, holes, bottlenecks, isolated corners, or shaped boards.
- No blockers yet: no crates, chains, jelly, chocolate/spreading blockers, bombs, safes, or conditional blockers.
- No objective variety yet: score is the only true goal. There are no collect-fruit, clear-jelly, drop-item, break-blocker, or mixed goals.
- No portal or teleporter gravity paths.
- No level authoring data format for hand-designed layouts.
- No target win-rate label per level.
- No bot simulation to estimate level difficulty before release.
- No analytics-driven dynamic difficulty adjustment.
- No pity system after repeated failures.
- No sawtooth pacing system that intentionally alternates easy, normal, hard, and super hard emotional beats.

Short version: FruitySplash is currently in a solid "core gameplay + numeric progression" stage. The next architecture step is to become "data-driven level design" where each level can control board shape, goals, blockers, spawn weights, rewards, difficulty label, and pacing role.

## Target Design Pillars

1. Make level design data-driven.
   - Every level should be described by a `LevelDefinition`.
   - The board engine should read level data instead of assuming every level is the same 8x6 rectangle.

2. Keep player emotion controlled by pacing, not only by bigger numbers.
   - Difficulty should rise in waves.
   - Hard levels should be followed by recovery levels.
   - Near-miss moments should be designed carefully, not spammed.

3. Use fair DDA, not hostile RNG.
   - Do not secretly punish the player by withholding needed fruit colors in final moves.
   - Good future DDA should help stuck players after repeated failures through better opening boards, softer spawn weights, or free pre-level help.

4. Use server authority for economy.
   - Coins, energy, booster purchases, booster consumption, and completion rewards should remain validated server-side.
   - Client-side level data can control feel, but the server should validate final reward claims.

5. Keep the game portable.
   - Level data should live in JSON/TypeScript structures that could be migrated to Unity later if needed.
   - Gameplay rules should stay separated from React Native UI.

## Future LevelDefinition Shape

The future `LevelDefinition` should grow from a score-only definition into this shape:

```ts
type LevelDifficulty = 'easy' | 'normal' | 'hard' | 'super-hard' | 'boss';

type LevelObjective =
  | { type: 'score'; target: number }
  | { type: 'collect-fruit'; fruit: number; count: number }
  | { type: 'clear-jelly'; count: number }
  | { type: 'break-blocker'; blocker: string; count: number }
  | { type: 'drop-item'; item: string; count: number };

type LevelDefinition = {
  id: number;
  chapter: number;
  pacingRole: 'teach' | 'practice' | 'normal' | 'relief' | 'spike' | 'boss';
  difficulty: LevelDifficulty;
  expectedWinRate: number;
  rows: number;
  cols: number;
  boardMask: string[];
  portals?: Array<{ from: Position; to: Position }>;
  fruitTypes: number;
  spawnWeights: number[];
  moveLimit: number;
  objectives: LevelObjective[];
  starTargets: { star1: number; star2: number; star3: number };
  blockers?: Array<{ type: string; row: number; col: number; hp?: number }>;
  preplacedSpecials?: Array<{ kind: SpecialCellKind; row: number; col: number; fruit: number }>;
  reward: { coinsBase: number; coinsPerStar: number; firstClearBonus: number };
  seed: number;
  metadata: {
    code: string;
    chapterName: string;
    tags: string[];
    notes: string;
  };
};
```

## Level 1-200 Architecture

### Global Score And Star Formula

Keep the current requested star formula because it is clean and predictable:

```ts
const blockIndex = Math.floor((levelId - 1) / 10);
const multiplier = Math.pow(1.1, blockIndex);
star1 = roundToNearest50(2750 * multiplier);
star2 = roundToNearest50(3550 * multiplier);
star3 = roundToNearest50(4550 * multiplier);
targetScore = star3;
```

Later, when non-score objectives exist, `targetScore` can stop being the only win condition. Stars can still use score, but winning can require objectives.

### Global Move Curve

Use this as the campaign target:

- Levels 1-5: 50 moves.
- Levels 6-20: 49 to 46 moves.
- Levels 21-50: 45 to 39 moves.
- Levels 51-90: 38 to 31 moves.
- Levels 91-130: 30 to 25 moves.
- Levels 131-189: 24 to 20 moves.
- Levels 190-200: 15 moves.

Design note: do not make the move curve the only difficulty source. Once blockers and board masks exist, a level can stay hard even with slightly more moves.

### Sawtooth Pacing Pattern

Each 10-level chapter should use a pacing rhythm like this:

- Level X1: easy or normal, introduces or resets the chapter feel.
- Level X2: normal.
- Level X3: normal with a small twist.
- Level X4: hard.
- Level X5: relief level after hard.
- Level X6: normal.
- Level X7: hard.
- Level X8: relief or practice.
- Level X9: hard or super hard.
- Level X0: boss or signature level.

Target win-rate guide:

- Easy: 85-95%.
- Normal: 60-75%.
- Hard: 25-40%.
- Super hard: 8-18%.
- Boss: 10-25%, depending on chapter.

Do not use 5% super-hard targets early. Save that for late-game mastery after the player understands boosters, blockers, and board shapes.

## Chapter Plan, Levels 1-200

### Levels 1-10: First Joy

Goal: teach swapping, match 3, cascades, score, stars, and level completion.

Design:

- Full 8x6 board.
- 5 fruit types.
- No blockers.
- No board holes.
- No DDA needed.
- Give generous opening boards.
- Teach that match 4 creates row/column wipe.

Difficulty:

- Mostly easy.
- Level 10 can be the first light boss, but still friendly.

### Levels 11-20: Special Cell Onboarding

Goal: teach match 4, match 5/cross wipe, match 7/color clear.

Design:

- Full board.
- Seed boards to make special-cell creation visible.
- Avoid blocker systems.
- Start making the score requirement 10% higher than levels 1-10.

Difficulty:

- Easy to normal.
- One hard-ish level around 19 or 20.

### Levels 21-30: Booster Onboarding

Goal: teach bomb, line rocket, fruity cross, and lightning fruit as tools.

Design:

- Keep board simple.
- Start placing levels where boosters feel useful but not mandatory.
- Add first soft near-miss levels, but keep win rate fair.

Difficulty:

- Normal with one hard level.

### Levels 31-40: First Objective Variety

Goal: introduce collect-fruit objectives.

Design:

- Add objectives like collect 20 strawberries or 18 blueberries.
- Keep score as secondary star meter.
- Spawn weights can slightly favor objective fruits early.

Difficulty:

- Normal.
- Level 40 can be a collect-fruit boss.

### Levels 41-50: First Board Shape

Goal: introduce board masks without blockers.

Design:

- Add small missing corners or side holes.
- First bottleneck board should still be wide enough to feel fair.
- Teach dead zones gently by placing useful matches near corners.

Difficulty:

- Normal to hard.

### Levels 51-60: Static Blockers

Goal: introduce simple blocker HP.

Design:

- Add crate/wood blocker.
- Blockers require adjacent match or special effect hit.
- Start with 1 HP.
- Use blockers to cover score opportunities, not to trap the player too hard.

Difficulty:

- Normal.
- One hard level at 59 or 60.

### Levels 61-70: Blocker Layers

Goal: make blockers consume moves.

Design:

- Add 2 HP blocker variants.
- Mix blockers with collect-fruit objectives.
- Keep board shape mostly simple so the new difficulty comes from blockers.

Difficulty:

- Normal to hard.

### Levels 71-80: Dead Zones And Corners

Goal: teach that corners and isolated cells need special cells.

Design:

- Add corner objectives.
- Use jelly/grass tiles in hard-to-hit cells.
- Encourage row/column wipe and cross wipe.

Difficulty:

- Hard spike around 79 or 80.

### Levels 81-90: Dynamic Blockers

Goal: introduce a spreading blocker or timed pressure.

Design:

- Add chocolate/slime style spreading blocker.
- If not cleared on a move, it can occupy an adjacent open cell.
- Keep spawn weights fair.

Difficulty:

- Hard, then relief after first introduction.

### Levels 91-100: First Boss Chapter

Goal: combine board shape, static blockers, and dynamic blockers.

Design:

- Level 100 should be a memorable boss.
- Use a shaped board with two lanes and a bottleneck.
- Give enough moves so the boss feels epic, not cheap.

Difficulty:

- Mix normal, hard, and one super-hard boss.

### Levels 101-110: Conditional Blockers

Goal: introduce blockers that require specific colors or special hits.

Design:

- Add safe/lock mechanic.
- Some blockers open only after matching the required fruit color nearby.
- Keep only one conditional rule in this chapter.

Difficulty:

- Normal to hard.

### Levels 111-120: Current Catalog Endgame Upgrade

Goal: make the current 120-level cap feel complete.

Design:

- Current implementation already ends here.
- Future work should upgrade these levels with hand-authored layouts instead of only generated score pressure.
- Preserve current star score math unless testing proves it too easy.

Difficulty:

- Hard-release band becomes a real hard band, not just lower timer/moves.

### Levels 121-130: Portal Introduction

Goal: introduce teleporters.

Design:

- Add simple one-way portal pairs.
- Show clear visual path.
- Do not mix portals with dynamic blockers yet.

Difficulty:

- Normal with one hard portal puzzle.

### Levels 131-140: Multi-Lane Gravity

Goal: make board topology matter.

Design:

- Add split board lanes.
- Some columns drop into different sections through portals.
- Objectives should sit at the end of lanes.

Difficulty:

- Normal to hard.

### Levels 141-150: Hard Economy Spike

Goal: create the first strong near-miss stretch.

Design:

- More dead-zone objectives.
- More 2 HP blockers.
- Carefully place one super-hard level.
- Reward first clear with enough coins to feel meaningful.

Difficulty:

- Sawtooth with a clear hard peak.

### Levels 151-160: Mixed Objectives

Goal: force prioritization.

Design:

- Score + collect fruit.
- Clear blockers + collect fruit.
- Do not use more than two objective types per level yet.

Difficulty:

- Normal to hard.

### Levels 161-170: Advanced Special-Cell Play

Goal: make chain reactions part of expected play.

Design:

- Boards should contain situations where row/column/cross/color special cells are valuable.
- Avoid making boosters mandatory.
- Hand-seed some preplaced specials in tutorial-style levels.

Difficulty:

- Hard, with relief after spikes.

### Levels 171-180: Dense Blocker Boards

Goal: test mastery of blockers and specials.

Design:

- Combine board masks with blockers.
- Add dead zones with blockers covering objectives.
- Use fewer moves but avoid unfair no-move states.

Difficulty:

- Hard to super hard.

### Levels 181-190: Pre-Endgame Mastery

Goal: bring the player down to about 20 moves.

Design:

- Levels become short and intense.
- Every move should matter.
- Do not add new mechanics here; test mastery of existing mechanics.

Difficulty:

- Mostly hard.
- One super hard.

### Levels 191-200: Endgame Boss Run

Goal: 15-move precision levels.

Design:

- 15 moves.
- No new rules.
- Each level should be hand-authored.
- Every board needs bot testing and human testing.
- Level 200 should be a signature boss with a strong reward.

Difficulty:

- Hard and super hard.
- Include at least two relief-style precision levels so the final chapter does not feel like a wall.

## Blocker Roadmap

Add blockers in this order:

1. Crate / wood blocker.
   - Static.
   - 1-3 HP.
   - Cleared by adjacent match or special hit.

2. Jelly / grass tile.
   - Under fruit.
   - Cleared when fruit on that tile is matched or hit.
   - Good for corner/dead-zone goals.

3. Chain / locked fruit.
   - Fruit cannot move until chain is broken.
   - Cleared by matching that fruit or hitting with special.

4. Spreading blocker.
   - Expands if not damaged on the move.
   - Use sparingly because it creates pressure quickly.

5. Conditional blocker.
   - Requires specific fruit color, key item, or multiple special hits.
   - Save for levels 100+.

## DDA And Pity System Plan

Do not start with manipulative RNG. Start with measurement.

Phase 1: record local analytics events:

- Level start.
- Level finish.
- Won/lost.
- Moves remaining.
- Score.
- Stars.
- Boosters used.
- Fail count per level.
- Near miss: lost while within 10% of target score or one objective away.

Phase 2: build a deterministic simulator:

- Random bot.
- Greedy bot.
- Special-cell-aware bot.
- Run each level seed at least 500-1000 times before tuning.

Phase 3: introduce pity only after data proves a churn risk:

- After 3 losses: slightly better opening board.
- After 5 losses: spawn weights become friendlier.
- After 7 losses: offer free pre-level booster or discounted +5 moves.
- Never secretly reduce needed fruit drops in a way that feels unfair.

## Reward And Economy Plan

Coins should reinforce progress without letting the player buy everything forever.

Reward formula:

- First clear bonus scales by level.
- Stars add bonus coins.
- Hard, super-hard, and boss levels can add a difficulty bonus.
- Replays should not repeat the first-clear bonus.

Recommended reward intent:

- Easy/normal levels: enough coins to feel progress.
- Hard levels: enough reward to offset occasional booster use.
- Super-hard/boss levels: strong first-clear reward to make the difficulty feel worth it.

## Implementation Roadmap

Phase 1: Expand catalog to 200.

- Update `createLevelCatalog()` default from 120 to 200.
- Update schema validation from exactly 120 to exactly 200.
- Add new difficulty bands for 121-200.
- Update tests.
- Keep current star formula.

Phase 2: Add level authoring fields.

- Add `difficulty`, `expectedWinRate`, `pacingRole`, `objectives`, `boardMask`, `spawnWeights`, `reward`, and `tags`.
- Keep old generated levels compatible through defaults.

Phase 3: Add board masks.

- Let the engine represent empty unusable cells.
- Gravity must skip masked cells.
- Match detection must ignore masked cells.
- Rendering must show board holes cleanly.

Phase 4: Add objectives.

- Score objective first.
- Fruit collection second.
- Jelly/clear tile third.
- Blocker clear fourth.

Phase 5: Add blockers.

- Start with static HP blockers.
- Add rendering, hit detection, special-cell damage, and scoring.
- Add tests for matches beside blockers, special hits, and cascades.

Phase 6: Add authoring and simulator tools.

- Create level template files.
- Add a CLI script that prints projected move limits, stars, rewards, and difficulty.
- Add bot simulation for win-rate estimates.

Phase 7: Add measured DDA.

- Add fail-count tracking.
- Add friendly opening-board logic after repeated failures.
- Keep server economy authoritative.

## Unity Or Unreal Migration Decision

Yes, FruitySplash can be transferred to Unity or Unreal, but it should not be the next move unless we decide to fully rebuild.

Unity:

- Best option if we ever leave Expo.
- Strong for 2D mobile games, animations, particles, asset packing, profiling, IAP, Play Games Services, and store builds.
- Easier than Unreal for a 2D Match-3.
- Still requires rewriting the React Native UI, routing, game board, settings, shop, Supabase integration, assets, and build pipeline.

Unreal:

- Not recommended for this game right now.
- Heavier runtime and package size.
- Better for 3D/high-end visuals than a 2D casual Match-3.
- More complex for mobile UI iteration.

Recommendation:

- Stay in Expo/React Native while the gameplay, economy, shop, and level architecture are still changing daily.
- Make the engine and level data portable now:
  - Keep gameplay rules in pure TypeScript modules.
  - Keep levels data-driven.
  - Avoid UI-specific logic in the engine.
  - Export future level data as JSON.
- If performance becomes the true blocker after profiling a release build, prototype the board engine in Unity and compare:
  - App size.
  - Startup time.
  - FPS during cascades.
  - Memory usage.
  - Asset loading time.
  - Development speed.

Best future path: finish the 1-200 design/data architecture in the current app first, then decide if Unity is worth a full rewrite. Unreal should be treated as overkill for FruitySplash unless the game becomes a much larger 3D/scene-heavy project.
