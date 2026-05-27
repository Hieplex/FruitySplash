# Fruity Splash Design

**Project:** `Fruity Splash`

**Goal:** Ship a polished, portrait, one-hand mobile match-3 game in Expo/React Native that feels relaxing and juicy, includes 100+ levels, uses a fresh natural fruit theme, and is structured for later store monetization without depending on ads or IAP for the first runnable release.

## Product Summary

`Fruity Splash` is a pure puzzle mobile game built around a classic match-3 core loop. Players swap adjacent fruit tiles on an `8 x 8` board to create matches of three or more, clear tiles, trigger cascades, race against a time limit, and earn up to three stars per level. The first release focuses on a stable and polished core with smooth motion, strong readability, satisfying feedback, local progression, and a level map covering at least 100 levels.

The game will not ship story, blockers, specials, boosters, ads, or economy systems in the first release. Those are intentionally deferred so the initial version can be stable, coherent, and store-ready instead of over-scoped.

## Core Decisions

- Stack: Expo + React Native + TypeScript
- Orientation: portrait
- Input: one-hand mobile play
- Theme: fresh natural fruit
- Mood: relaxing and juicy
- Genre: pure match-3 puzzle
- Grid: `8 x 8`
- Fruit variety: `5` tile types
- Pressure model: time-limit levels
- Progression: level map + stars
- Scope floor: `100+` levels
- Assets: all created in-project with AI-generated visuals

## Recommended Approach

### Recommended

Build a pure match-3 runner first.

This version includes only the systems required to make the puzzle loop excellent: board logic, timer, stars, level map, progression, juice, assets, and mobile UX. This is the lowest-risk path to a product-ready build and the right foundation for later blockers, specials, ads, and meta systems.

### Alternatives Considered

#### Match-3 with early blockers

Adds crates, ice, or terrain obstacles in the first release. This improves variety but sharply increases board-state complexity, balancing cost, and testing risk before the core loop is proven.

#### Match-3 with full meta systems

Adds monetization-ready systems like ads, lives, boosters, or a remove-ads purchase now. This looks closer to a mature live casual game but would slow down the first stable release and distract from puzzle quality.

## Game Feel

The game should feel calm, juicy, readable, and tactile rather than loud or aggressive.

- Buttons use soft scale, depth, and easing
- Swaps feel responsive and clean
- Matches pop with satisfying clarity
- Falling tiles land with a subtle bounce
- Cascades feel rewarding without becoming visually chaotic
- UI stays readable on smaller phones
- Visuals favor fresh fruit, clean light backgrounds, and inviting color contrast rather than neon candy overload

## Core Loop

1. Player enters a level from the level map.
2. A timed match-3 board is shown with the level goal and star thresholds.
3. Player swaps adjacent fruit tiles.
4. Invalid swaps revert cleanly.
5. Valid matches clear tiles, refill the board, and may trigger cascades.
6. Score increases from direct matches and cascades.
7. Timer continues until the goal is met or time runs out.
8. Results screen shows win/lose, stars earned, score, and next actions.
9. On win, next level unlocks and stars are saved locally.

## Launch Feature Scope

### Included In First Release

- Playable match-3 board
- Valid adjacent swap system
- Match detection
- Clear, gravity, refill, and cascade resolution
- Time-limit gameplay
- Score system
- 3-star scoring
- Level goals
- Level map progression
- Pause and restart
- Local save data
- Settings surface with at least audio toggle
- Smooth button transitions and tile animation
- AI-generated asset pack
- 100+ levels
- Android/iOS-ready Expo app structure

### Explicitly Deferred

- Ads
- Boosters
- Blockers
- Special pieces
- Lives/energy systems
- Daily rewards
- Accounts or cloud sync
- Social features
- Story wrapper

## Board Rules

- Board size: `8 x 8`
- Tile types: `5`
- Only adjacent orthogonal swaps are allowed
- A move is valid only if it creates at least one match
- Match size supported in v1: `3+`
- Basic matching only for v1
- No special tile creation in the first release
- Refill must avoid unresolved frozen states and must preserve playability

## Level System

Levels should be data-driven rather than hardcoded into screens or logic branches.

Each level definition should support:

- level id
- board dimensions if future variants are added
- fruit pool
- timer duration
- score target
- one-star threshold
- two-star threshold
- three-star threshold
- optional board seed or board constraints
- difficulty band metadata

This keeps the app scalable past 100 levels and allows balancing without rewriting gameplay code.

## Difficulty Plan

### Levels 1-20

Teach rhythm, board reading, swap expectation, and timer pressure gently.

### Levels 21-50

Increase target pressure, board variation, and cascade dependency.

### Levels 51-80

Tighter timers and less forgiving score thresholds.

### Levels 81-120

Launch-ready “hard mode” band with stronger score pressure and more demanding board pacing.

The first release target is `120` levels so the game clearly exceeds the user’s `100+` requirement.

## UX And Screens

The first release should include:

- splash/loading
- main menu
- level map
- gameplay screen
- pause modal
- results modal/screen
- settings

UI should stay outside the board logic boundary. Puzzle rules should not live inside screen components.

## Architecture

The project should be split into clean systems.

### App Shell

Owns routing, menus, settings, map navigation, and presentation flow.

### Puzzle Engine

Owns board generation, swaps, match finding, tile clearing, gravity, refill, cascade resolution, timer state, scoring, and win/loss checks.

### Level Data Layer

Owns level definitions, difficulty bands, and data loading.

### Progress Save Layer

Owns unlocked level, stars, best score, and settings using local persistence.

### Asset Layer

Owns fruit art, icons, backgrounds, UI frames, and visual manifest references.

### Animation And Juice Layer

Owns screen transitions, button interaction, tile movement, match feedback, and result presentation.

## 6-Agent Studio Structure

The implementation should be split across 6 subagents with clean ownership:

### Agent 1: Core Puzzle Engineer

Owns the match-3 engine, board state, swap validation, match detection, refill, cascades, timer, and scoring.

### Agent 2: Level Systems Designer

Owns level schema, level generation helpers, 120 level definitions, star thresholds, and difficulty ramp tuning.

### Agent 3: Mobile UI Engineer

Owns app shell, navigation, map screen, results, settings, and layout/readability for portrait play.

### Agent 4: Art Director And Asset Builder

Owns art prompts, generated fruit assets, backgrounds, icons, and the visual system integration.

### Agent 5: Motion And Polish Engineer

Owns smooth button animations, transitions, board juice, pop timing, bounce timing, and tactile feedback polish.

### Agent 6: QA And Release Engineer

Owns test coverage, dead-board checks, progression verification, performance checks, and store-readiness review.

## Asset Direction

All assets should be original and generated for this project.

Art direction:

- fresh natural fruit rather than candy coating
- light, bright, inviting palette
- clean soft UI panels
- playful splash accents
- readable fruit silhouettes at small sizes
- strong visual distinction between the 5 fruit types

Asset sets needed:

- 5 fruit tile visuals
- fruit splash effects
- app icon
- splash screen art
- menu background
- map elements
- star icons
- button styles
- pause/results UI decoration

## Animation Standards

Every button should feel smooth and intentional.

- press scale down with soft easing
- release rebound
- screen transitions with subtle slide/fade
- tile swap tween
- invalid swap tween back
- match pop
- fall/drop easing
- landing bounce
- result star reveal

No abrupt or default-looking transitions should remain in final UI.

## Save Data

Persist locally:

- highest unlocked level
- stars per level
- best score per level
- settings toggles

Do not store renderer objects or derived animation state.

## Product-Ready Definition

The app is considered product-ready when:

- it installs and runs cleanly
- there is no dead-board or stuck-resolution bug
- invalid swaps are handled reliably
- refill/cascade logic is stable
- progression unlocks correctly
- 120 levels are present and reachable
- star ratings save correctly
- portrait layout reads well on phones
- performance remains smooth on normal mobile hardware
- art feels coherent and non-placeholder
- the app has icon/splash/store-screenshot generation path

## Testing And Verification Expectations

Verification should include:

- unit-style coverage for board logic
- swap validity checks
- match detection checks
- cascade resolution checks
- timer win/loss checks
- progression save/load checks
- smoke pass across multiple level bands
- UI motion sanity checks
- final runnable build verification

## Risks And Mitigations

### Risk: Board logic becomes tangled with UI

Mitigation: keep the puzzle engine independent from rendering and screen components.

### Risk: 100+ levels become repetitive

Mitigation: use structured difficulty bands, score tuning, and seeded board variation.

### Risk: Motion polish causes sluggishness

Mitigation: use short, readable animation timings and verify on actual mobile targets.

### Risk: Asset generation creates inconsistent fruit identity

Mitigation: create a locked fruit style guide before generating the full pack.

## Next Step

After this spec is approved, the next action is to write the implementation plan, then dispatch the 6 subagents against that plan and build the game to a runnable product standard inside this folder.
