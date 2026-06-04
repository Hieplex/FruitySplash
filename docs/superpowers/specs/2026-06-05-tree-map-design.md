# FruitySplash Tree Map Design

**Project:** `FruitySplash`

**Feature:** `Infinite world-tree level map`

**Goal:** Replace the current heavy chapter-screen workflow with a reusable vertical tree-map system that feels epic, magical, and consistent with the existing FruitySplash fruit style, while staying practical to build with mostly static generated art plus code-driven motion.

## Product Summary

The new map should feel like climbing a legendary fruit world-tree that breaks through the sky into endless heaven. Instead of building one custom chapter screen per set of levels, the game should reuse one scrollable map system made from trunk segments, fruit sockets, leaf curtains, and lightweight motion.

The map should feel grand in scale but still visually belong to FruitySplash. That means the fantasy is myth-like and ancient, but the surfaces stay rounded, bright, juicy, and readable rather than dark, realistic, or gritty.

## Core Decisions

- Map fantasy: `fruit world-tree rising into endless heaven`
- Structure: `straight vertical climb first`
- Navigation: `hybrid free scroll + smooth refocus`
- Progression unit: `5 levels per band`
- Band shape: `sinuous trunk with a new visible side each band`
- Node style: `glowing fruit sockets`
- Current node state: `bright glow + gentle pulse`
- Completed node state: `small star or check marker`
- Locked node state: `bud / unripe fruit`
- Top gate: `moving leaf curtain`
- Unlock reveal: `leaves part left and right`
- Next-band tease: `trunk + leaves + faint glow`
- Layout reuse: `same base pattern for v1`

## Why This Direction

The current chapter approach can look good, but it is too expensive to repeat if each screen needs custom composition, motion, and tuning. A reusable tree-band system lowers content cost without flattening the game into a generic infinite list.

This approach is a better fit for current production constraints:

- most visual content can remain static generated art
- motion can come from code instead of frame-by-frame animated images
- the map can grow indefinitely without needing a new full-screen composition every time
- the fruit-circle language already present in the game becomes part of the world itself

## Recommended Approach

### Recommended

Build v1 as a `static band stack` system with reusable layout anchors and code-driven animation.

Each 5-level band uses the same approved layout pattern and the same transition rules. The trunk bends between bands to reveal a new side of the tree. The system should be authored so later versions can add controlled variation without rewriting the structure.

### Alternatives Considered

#### Fully generated infinite map first

Generate every band procedurally from rules immediately. This scales better long-term but adds more tuning risk before the visual language is proven.

#### Continue with chapter-card screens

Keep hand-authoring chapter-style screens with 10 challenges each. This may allow strong one-off visuals but keeps production slow and makes future expansion expensive.

## Experience Goals

The map should feel:

- epic in scale
- sacred and sky-reaching
- soft and welcoming rather than intimidating
- alive through motion, light, and atmospheric depth
- easy to read at a glance on a phone

The player should feel like they are ascending a living heavenly tree, not browsing a flat menu of levels.

## Visual Direction

### World Fantasy

The tree is the world spine. It rises from the ground, pierces the cloud layers, and continues into a heavenly upper world. The climb should imply endless vertical progress even if only a small visible portion is on screen at one time.

### Style Rule

Use `myth-like structure, casual-game surface style`.

That means:

- huge trunk scale
- wrapped vines
- giant leaf masses
- bright heavenly light
- rounded silhouettes
- juicy fruit reads
- clean shapes over gritty realism

The tree may be ancient in feeling, but it should still match the current FruitySplash art language.

## Map Structure

### Band System

One band equals `5 levels`.

Each band contains:

- one trunk segment
- five level sockets
- one leaf curtain at the top
- one tease area above the curtain

The same base composition should be reused in v1 so implementation stays stable and fast to tune.

### Trunk Rhythm

The trunk should be sinuous rather than straight. Each new band reveals a new side of the trunk. The bend does not need true 3D rotation in v1; it only needs to feel like the visible face of the tree has shifted.

This gives the map a repeating progression rhythm:

1. climb a readable 5-level segment
2. reach the canopy gate
3. unlock the next segment
4. move upward to a new face of the tree

### Node Layout

Inside each band, the five sockets should use a `soft left-right weave`.

The sockets should stay close enough to the trunk to feel attached to it, while alternating slightly left and right so the climb feels organic.

The base layout should stay fixed in v1. Minor per-band variation is deferred until the core system is proven.

## Node States

### Locked

Locked future levels appear as `buds` or `unripe fruit`.

They should look alive and not-yet-ready rather than simply grayed out.

### Current

The current playable level uses:

- brighter glow
- gentle pulse

This state should read immediately without becoming noisy.

### Completed

Completed levels keep their fruit identity and gain a small `star` or `check` mark as a clear gameplay signal.

## Navigation And Camera

### Primary Navigation

The map uses a `hybrid` movement model:

- the player can freely scroll the tree
- tapping a level smoothly refocuses the camera
- opening the screen should center the current progression band in a stable readable area

### Resting Framing

The active band should rest in the lower-middle portion of the screen rather than dead center. This leaves room above for the leaf curtain and for a small tease of the next band.

### Return Behavior

When the player returns from gameplay, the map should smoothly restore focus to the current playable level and its containing band instead of dropping the player in an arbitrary scroll position.

## Band Gate And Reveal

### Leaf Curtain

At the top of each band, a dense cluster of leaves acts as a canopy curtain that blocks full visibility of the next band.

The canopy should have gentle wind motion at idle so the map feels alive even when the player is not interacting.

### Pre-Unlock Tease

Before the next band is unlocked, the player should only see a tiny tease above the curtain:

- a bit of trunk
- a bit of leaves
- a faint glow

This is enough to suggest there is more above without fully exposing the next band.

### Unlock Animation

When the player clears level 5 of a band:

1. the leaf curtain parts left and right
2. the camera drags upward
3. the next band becomes visible
4. the new current band settles into the same readable focus zone

The v1 reveal should prioritize the `parting curtain` motion first. Extra drifting leaves or more complex layered effects can be added later without changing the interaction model.

## Motion Strategy

The map should depend mainly on code-driven motion instead of animated painted assets.

Recommended reusable motion sources:

- leaf sway
- socket pulse
- gentle cloud drift
- light shimmer
- soft camera easing
- occasional floating particles or pollen later

This keeps the system scalable with current tooling and asset-production limits.

## Content Model

The map should move away from screen-by-screen composition and toward a repeatable data model.

Each band definition should eventually support:

- band id
- level ids for the five sockets
- bend direction or visible trunk face
- socket anchor positions
- curtain style id
- tease style id
- optional local decorative pieces

V1 can hardcode some of this if needed, but the system should be shaped so the band structure can become data-driven without a rewrite.

## Architecture

### Tree Map Screen

Owns the scroll surface, focus behavior, band visibility, and the transition flow between gameplay completion and band reveal.

### Band Renderer

Owns rendering a single 5-level band from reusable anchors and asset pieces.

### Node Renderer

Owns fruit socket, bud, completed marker, and current-level pulse rendering.

### Atmosphere Layer

Owns cloud drift, light treatment, leaf motion, and future ambient particles.

### Progress Mapping Layer

Owns converting saved level progress into:

- current band
- current socket
- completed sockets
- locked sockets
- visible unlocked bands

## Error Handling And Edge Cases

- The map must restore a valid focus target even if progress data is partially missing.
- If a band is incomplete, its curtain must remain closed.
- The current playable level must always be interactable and visually obvious.
- Refocus behavior should clamp safely so the camera never lands between invalid ranges.
- The system should avoid visual jumps when returning from a level or after unlocking a new band.

## Testing Strategy

### Functional

- current level focuses correctly on map open
- completed levels show marker state correctly
- locked levels render as buds
- clearing level 5 triggers the reveal flow exactly once
- the next band becomes interactable after unlock

### Visual

- active band framing remains readable on small and tall phones
- leaf curtain does not hide current sockets incorrectly
- tease area stays subtle and does not expose the full next band
- pulse and wind motion read clearly without looking noisy

### Future Scalability

- multiple bands can be stacked without layout drift
- the same band pattern remains stable for higher level counts
- the data model can extend to branch or cluster variants later

## Deferred Upgrades

These are intentionally parked until v1 works:

- branch hopping
- spiral climb
- cluster zones
- mixed socket layout patterns
- hybrid leaf reveal with drifting leaves
- larger landmark reveals
- denser atmospheric FX
- more advanced generated band variation

## Success Criteria

The design is successful when:

- adding new progression no longer requires building a custom chapter screen
- the map feels like one coherent world-tree rather than a UI list
- the system works mainly with reusable art pieces and code motion
- the player can immediately understand where they are and what to tap next
- each 5-level unlock feels rewarding enough to replace the old chapter cadence
