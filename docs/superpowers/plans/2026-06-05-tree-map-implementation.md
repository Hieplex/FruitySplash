# Tree Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable world-tree level map that replaces the custom chapter-screen workflow with a 5-level band system, smooth focus behavior, and a leaf-curtain unlock reveal.

**Architecture:** Keep the tree-map rules out of `app/map.tsx` by splitting the feature into domain helpers, focus/reveal helpers, a view-model layer, and small presentational components. Use mostly static art plus code-driven motion so the map scales without requiring custom animated scenes for each progression band.

**Tech Stack:** Expo Router, React Native Animated, TypeScript, Vitest

---

## File Structure

**Create**

- `src/navigation/tree-map-model.ts` - band math, node-state rules, current-band derivation
- `src/navigation/tree-map-focus.ts` - scroll targeting and unlock reveal plan helpers
- `src/navigation/tree-map-view-model.ts` - convert progress + layout rules into render-ready band data
- `src/components/tree-map-node.tsx` - render one fruit socket, bud, or completed node marker
- `src/components/tree-map-canopy.tsx` - render the moving leaf curtain and tease strip
- `src/components/tree-map-band.tsx` - render one 5-level band
- `src/components/tree-map-atmosphere.tsx` - render light/cloud/ambient motion layers
- `tests/navigation/tree-map-model.test.ts`
- `tests/navigation/tree-map-focus.test.ts`
- `tests/navigation/tree-map-view-model.test.ts`

**Modify**

- `app/map.tsx` - replace challenge-button layout with the tree-map screen
- `app/chapters.tsx` - convert legacy chapter route into a redirect or thin wrapper to `/map`
- `app/home.tsx` - route primary play CTA to `/map`
- `app/level/[id].tsx` - send back-navigation to `/map`
- `app/results.tsx` - keep “Level map” actions pointed at the tree map
- `app/settings.tsx` - route “Back to menu” or map-facing actions consistently
- `src/navigation/results-route.ts` - add focus/reveal query params for post-win map returns
- `src/game/assets/runtime-assets.ts` - add tree-map runtime asset registry
- `src/game/assets/preload-assets.native.ts` - preload the tree-map runtime assets
- `tests/navigation/results-route.test.ts` - cover tree-map reveal routing

## Task 1: Add the tree-band domain model

**Files:**
- Create: `src/navigation/tree-map-model.ts`
- Test: `tests/navigation/tree-map-model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '@/state/progress-helpers';
import {
  TREE_LEVELS_PER_BAND,
  buildTreeBands,
  getTreeBandIndexForLevel,
  getTreeBandLevelRange,
} from '@/navigation/tree-map-model';

describe('tree map model', () => {
  it('groups levels into 5-level bands', () => {
    expect(TREE_LEVELS_PER_BAND).toBe(5);
    expect(getTreeBandIndexForLevel(1)).toBe(0);
    expect(getTreeBandIndexForLevel(5)).toBe(0);
    expect(getTreeBandIndexForLevel(6)).toBe(1);
    expect(getTreeBandLevelRange(1)).toEqual({ startLevel: 1, endLevel: 5 });
    expect(getTreeBandLevelRange(2)).toEqual({ startLevel: 6, endLevel: 10 });
  });

  it('marks completed, current, and locked node states from progress', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 3,
      starsByLevel: { 1: 3, 2: 1 },
    };

    const bands = buildTreeBands(progress, 10);

    expect(bands[0].levels.map((level) => level.state)).toEqual([
      'completed',
      'completed',
      'current',
      'locked',
      'locked',
    ]);
    expect(bands[0].currentLevelId).toBe(3);
    expect(bands[1].teaseVisible).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/navigation/tree-map-model.test.ts`

Expected: FAIL with `Cannot find module '@/navigation/tree-map-model'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { ProgressState } from '@/state/progress-helpers';

export const TREE_LEVELS_PER_BAND = 5;

export type TreeNodeState = 'completed' | 'current' | 'locked';

export type TreeBand = {
  bandIndex: number;
  startLevel: number;
  endLevel: number;
  currentLevelId: number | null;
  teaseVisible: boolean;
  levels: Array<{
    levelId: number;
    state: TreeNodeState;
  }>;
};

export function getTreeBandIndexForLevel(levelId: number) {
  return Math.max(0, Math.floor((Math.max(1, levelId) - 1) / TREE_LEVELS_PER_BAND));
}

export function getTreeBandLevelRange(bandIndex: number) {
  const safeBandIndex = Math.max(0, bandIndex);
  const startLevel = safeBandIndex * TREE_LEVELS_PER_BAND + 1;
  return {
    startLevel,
    endLevel: startLevel + TREE_LEVELS_PER_BAND - 1,
  };
}

export function buildTreeBands(progress: ProgressState, maxLevel: number): TreeBand[] {
  const bandCount = Math.max(1, Math.ceil(maxLevel / TREE_LEVELS_PER_BAND));
  const currentBandIndex = getTreeBandIndexForLevel(progress.unlockedLevel);

  return Array.from({ length: bandCount }, (_, bandIndex) => {
    const { startLevel, endLevel } = getTreeBandLevelRange(bandIndex);
    const levels = Array.from({ length: TREE_LEVELS_PER_BAND }, (_, offset) => {
      const levelId = startLevel + offset;
      const completed = (progress.starsByLevel[levelId] ?? 0) > 0;
      const current = levelId === progress.unlockedLevel;

      return {
        levelId,
        state: completed ? 'completed' : current ? 'current' : 'locked',
      };
    }).filter((level) => level.levelId <= maxLevel);

    return {
      bandIndex,
      startLevel,
      endLevel: Math.min(endLevel, maxLevel),
      currentLevelId: levels.find((level) => level.state === 'current')?.levelId ?? null,
      teaseVisible: bandIndex === currentBandIndex + 1,
      levels,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/navigation/tree-map-model.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/navigation/tree-map-model.test.ts src/navigation/tree-map-model.ts
git commit -m "feat: add tree map band model"
```

## Task 2: Add focus and reveal helpers

**Files:**
- Create: `src/navigation/tree-map-focus.ts`
- Test: `tests/navigation/tree-map-focus.test.ts`
- Modify: `src/navigation/results-route.ts`
- Test: `tests/navigation/results-route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { getBandRevealPlan, getBandScrollOffset } from '@/navigation/tree-map-focus';

describe('tree map focus', () => {
  it('focuses the active band into the lower-middle play area', () => {
    expect(getBandScrollOffset({ bandIndex: 0, bandHeight: 520, focusInset: 180 })).toBe(0);
    expect(getBandScrollOffset({ bandIndex: 2, bandHeight: 520, focusInset: 180 })).toBe(860);
  });

  it('builds a reveal plan for the next band after clearing level 5', () => {
    expect(getBandRevealPlan({ currentLevelId: 5, unlockedLevel: 6 })).toEqual({
      revealBandStartLevel: 6,
      focusLevel: 6,
    });
    expect(getBandRevealPlan({ currentLevelId: 4, unlockedLevel: 5 })).toBeNull();
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '@/state/progress-helpers';
import { getResultsRouteModel } from '@/navigation/results-route';

describe('results route model', () => {
  it('returns to the tree map with reveal params after finishing a band', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 6,
    };

    expect(
      getResultsRouteModel({
        levelIdParam: '5',
        won: true,
        progress,
        levelIds: [1, 2, 3, 4, 5, 6],
      }),
    ).toMatchObject({
      primaryLabel: 'Level map',
      primaryRoute: '/map?focusLevel=6&revealBandStart=6',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/navigation/tree-map-focus.test.ts tests/navigation/results-route.test.ts`

Expected: FAIL because `tree-map-focus.ts` does not exist and the results-route assertion does not match current behavior

- [ ] **Step 3: Write the minimal implementation**

```ts
export function getBandScrollOffset({
  bandIndex,
  bandHeight,
  focusInset,
}: {
  bandIndex: number;
  bandHeight: number;
  focusInset: number;
}) {
  return Math.max(0, bandIndex * bandHeight - focusInset);
}

export function getBandRevealPlan({
  currentLevelId,
  unlockedLevel,
}: {
  currentLevelId: number;
  unlockedLevel: number;
}) {
  const finishedBand = currentLevelId % 5 === 0;
  const movedToNextLevel = unlockedLevel === currentLevelId + 1;

  if (!finishedBand || !movedToNextLevel) {
    return null;
  }

  return {
    revealBandStartLevel: unlockedLevel,
    focusLevel: unlockedLevel,
  };
}
```

```ts
import { getBandRevealPlan } from '@/navigation/tree-map-focus';

// inside getResultsRouteModel(...)
const revealPlan = won ? getBandRevealPlan({ currentLevelId: requestedLevelId, unlockedLevel: progress.unlockedLevel }) : null;

if (revealPlan) {
  return {
    displayLevelId,
    primaryLabel: 'Level map',
    primaryRoute: `/map?focusLevel=${revealPlan.focusLevel}&revealBandStart=${revealPlan.revealBandStartLevel}`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/navigation/tree-map-focus.test.ts tests/navigation/results-route.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/navigation/tree-map-focus.test.ts tests/navigation/results-route.test.ts src/navigation/tree-map-focus.ts src/navigation/results-route.ts
git commit -m "feat: add tree map focus and reveal helpers"
```

## Task 3: Build the render view model and asset registry

**Files:**
- Create: `src/navigation/tree-map-view-model.ts`
- Test: `tests/navigation/tree-map-view-model.test.ts`
- Modify: `src/game/assets/runtime-assets.ts`
- Modify: `src/game/assets/preload-assets.native.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '@/state/progress-helpers';
import { buildTreeMapViewModel } from '@/navigation/tree-map-view-model';

describe('tree map view model', () => {
  it('assigns trunk side, node anchors, and canopy visibility per band', () => {
    const progress = {
      ...createDefaultProgress(),
      unlockedLevel: 3,
      starsByLevel: { 1: 3, 2: 2 },
    };

    const viewModel = buildTreeMapViewModel({ progress, maxLevel: 10 });

    expect(viewModel.bands[0].trunkSide).toBe('left');
    expect(viewModel.bands[1].trunkSide).toBe('right');
    expect(viewModel.bands[0].nodes).toHaveLength(5);
    expect(viewModel.bands[0].canopy.mode).toBe('closed');
    expect(viewModel.bands[1].tease.visible).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/navigation/tree-map-view-model.test.ts`

Expected: FAIL with `Cannot find module '@/navigation/tree-map-view-model'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import { buildTreeBands } from '@/navigation/tree-map-model';
import type { ProgressState } from '@/state/progress-helpers';

const BASE_NODE_ANCHORS = [
  { x: 0.42, y: 0.16 },
  { x: 0.58, y: 0.31 },
  { x: 0.44, y: 0.48 },
  { x: 0.6, y: 0.66 },
  { x: 0.48, y: 0.83 },
] as const;

export function buildTreeMapViewModel({
  progress,
  maxLevel,
}: {
  progress: ProgressState;
  maxLevel: number;
}) {
  const bands = buildTreeBands(progress, maxLevel);

  return {
    bands: bands.map((band) => ({
      bandIndex: band.bandIndex,
      trunkSide: band.bandIndex % 2 === 0 ? 'left' : 'right',
      nodes: band.levels.map((level, index) => ({
        levelId: level.levelId,
        state: level.state,
        anchor: BASE_NODE_ANCHORS[index],
      })),
      canopy: {
        mode: band.currentLevelId === null ? 'closed' : 'closed',
      },
      tease: {
        visible: band.teaseVisible,
      },
    })),
  };
}
```

```ts
// add to runtime-assets.ts
export const treeMapRuntimeAssets = {
  trunk: backgroundRuntimeAssets.map,
  canopy: challenge1,
  glow: coinIcon,
  completedBadge: fullStar,
  lockedBud: emptyStar,
} as const;
```

```ts
// add to preload-assets.native.ts
import { treeMapRuntimeAssets } from '@/game/assets/runtime-assets';

export async function warmTreeMapAssets() {
  return Promise.all(Object.values(treeMapRuntimeAssets).map((asset) => Asset.loadAsync(asset)));
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run test -- tests/navigation/tree-map-view-model.test.ts`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/navigation/tree-map-view-model.test.ts src/navigation/tree-map-view-model.ts src/game/assets/runtime-assets.ts src/game/assets/preload-assets.native.ts
git commit -m "feat: add tree map view model and asset registry"
```

## Task 4: Build the tree-map components

**Files:**
- Create: `src/components/tree-map-node.tsx`
- Create: `src/components/tree-map-canopy.tsx`
- Create: `src/components/tree-map-band.tsx`
- Create: `src/components/tree-map-atmosphere.tsx`

- [ ] **Step 1: Implement the node component**

```tsx
import { Animated, Image, Pressable, View } from 'react-native';
import { treeMapRuntimeAssets } from '@/game/assets/runtime-assets';

export function TreeMapNode({
  levelId,
  state,
  anchor,
  onPress,
}: {
  levelId: number;
  state: 'completed' | 'current' | 'locked';
  anchor: { x: number; y: number };
  onPress: (levelId: number) => void;
}) {
  const pulse = state === 'current' ? 1.08 : 1;

  return (
    <Pressable
      onPress={() => state !== 'locked' && onPress(levelId)}
      style={{
        position: 'absolute',
        left: `${anchor.x * 100}%`,
        top: `${anchor.y * 100}%`,
        width: 72,
        height: 72,
        marginLeft: -36,
        marginTop: -36,
      }}
    >
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Image source={state === 'locked' ? treeMapRuntimeAssets.lockedBud : treeMapRuntimeAssets.glow} style={{ width: 72, height: 72 }} />
        {state === 'completed' ? (
          <Image source={treeMapRuntimeAssets.completedBadge} style={{ position: 'absolute', right: -2, top: -2, width: 22, height: 22 }} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Implement the canopy and atmosphere components**

```tsx
import { Animated, Image, View } from 'react-native';
import { treeMapRuntimeAssets } from '@/game/assets/runtime-assets';

export function TreeMapCanopy({
  revealProgress,
  teaseVisible,
}: {
  revealProgress: Animated.Value;
  teaseVisible: boolean;
}) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 170, overflow: 'hidden' }}>
      <Animated.Image source={treeMapRuntimeAssets.canopy} style={{ position: 'absolute', left: 0, width: '52%', height: '100%' }} />
      <Animated.Image source={treeMapRuntimeAssets.canopy} style={{ position: 'absolute', right: 0, width: '52%', height: '100%' }} />
      {teaseVisible ? <Image source={treeMapRuntimeAssets.glow} style={{ position: 'absolute', top: 12, alignSelf: 'center', width: 24, height: 24, opacity: 0.3 }} /> : null}
    </View>
  );
}
```

```tsx
import { View } from 'react-native';

export function TreeMapAtmosphere() {
  return (
    <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, opacity: 0.2 }} />
  );
}
```

- [ ] **Step 3: Implement the band component**

```tsx
import { Animated, ImageBackground, View } from 'react-native';
import { treeMapRuntimeAssets } from '@/game/assets/runtime-assets';
import { TreeMapCanopy } from '@/components/tree-map-canopy';
import { TreeMapNode } from '@/components/tree-map-node';

export function TreeMapBand({
  band,
  revealProgress,
  onOpenLevel,
}: {
  band: ReturnType<typeof import('@/navigation/tree-map-view-model').buildTreeMapViewModel>['bands'][number];
  revealProgress: Animated.Value;
  onOpenLevel: (levelId: number) => void;
}) {
  return (
    <ImageBackground source={treeMapRuntimeAssets.trunk} style={{ height: 520, width: '100%' }}>
      {band.nodes.map((node) => (
        <TreeMapNode key={node.levelId} levelId={node.levelId} state={node.state} anchor={node.anchor} onPress={onOpenLevel} />
      ))}
      <TreeMapCanopy revealProgress={revealProgress} teaseVisible={band.tease.visible} />
    </ImageBackground>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tree-map-node.tsx src/components/tree-map-canopy.tsx src/components/tree-map-band.tsx src/components/tree-map-atmosphere.tsx
git commit -m "feat: add tree map presentation components"
```

## Task 5: Integrate the new tree map screen and retire the chapter route

**Files:**
- Modify: `app/map.tsx`
- Modify: `app/chapters.tsx`
- Modify: `app/home.tsx`
- Modify: `app/level/[id].tsx`
- Modify: `app/results.tsx`
- Modify: `app/settings.tsx`

- [ ] **Step 1: Rewrite `app/map.tsx` around the tree-map view model**

```tsx
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { TreeMapAtmosphere } from '@/components/tree-map-atmosphere';
import { TreeMapBand } from '@/components/tree-map-band';
import { LEVELS } from '@/game/levels/levels';
import { getBandRevealPlan, getBandScrollOffset } from '@/navigation/tree-map-focus';
import { buildTreeMapViewModel } from '@/navigation/tree-map-view-model';
import { useProgress } from '@/state/progress-store';
import { useScreenWipe } from '@/state/screen-wipe';

export default function MapScreen() {
  const params = useLocalSearchParams<{ focusLevel?: string; revealBandStart?: string }>();
  const progress = useProgress();
  const screenWipe = useScreenWipe();
  const scrollRef = useRef<Animated.ScrollView | null>(null);
  const revealProgress = useRef(new Animated.Value(0)).current;
  const viewModel = useMemo(
    () => buildTreeMapViewModel({ progress, maxLevel: LEVELS.at(-1)?.id ?? 1 }),
    [progress],
  );

  useEffect(() => {
    screenWipe.setScreenReady();
    const focusLevel = Number(params.focusLevel ?? progress.unlockedLevel);
    const bandIndex = Math.floor((Math.max(1, focusLevel) - 1) / 5);
    const offset = getBandScrollOffset({ bandIndex, bandHeight: 520, focusInset: 180 });
    scrollRef.current?.scrollTo({ y: offset, animated: false });
  }, [params.focusLevel, progress.unlockedLevel, screenWipe]);

  return (
    <View style={{ flex: 1 }}>
      <TreeMapAtmosphere />
      <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {viewModel.bands.map((band) => (
          <TreeMapBand
            key={band.bandIndex}
            band={band}
            revealProgress={revealProgress}
            onOpenLevel={(levelId) => screenWipe.push(`/level/${levelId}`)}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Normalize app routes so the tree map is the single source**

```tsx
// app/chapters.tsx
import { Redirect } from 'expo-router';

export default function ChaptersScreen() {
  return <Redirect href="/map" />;
}
```

```tsx
// change these navigations to /map
screenWipe.replace('/map');
screenWipe.push('/map');
```

Apply that route normalization in:

- `app/home.tsx`
- `app/level/[id].tsx`
- `app/results.tsx`
- `app/settings.tsx`

- [ ] **Step 3: Run targeted tests and typecheck**

Run: `npm run test -- tests/navigation/tree-map-model.test.ts tests/navigation/tree-map-focus.test.ts tests/navigation/tree-map-view-model.test.ts tests/navigation/results-route.test.ts`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/map.tsx app/chapters.tsx app/home.tsx app/level/[id].tsx app/results.tsx app/settings.tsx
git commit -m "feat: replace chapter flow with tree map screen"
```

## Task 6: Final verification and cleanup

**Files:**
- Review: `app/map.tsx`
- Review: `src/navigation/tree-map-model.ts`
- Review: `src/navigation/tree-map-focus.ts`
- Review: `src/navigation/tree-map-view-model.ts`

- [ ] **Step 1: Run the full fast verification pass**

Run: `npm run test -- tests/navigation/tree-map-model.test.ts tests/navigation/tree-map-focus.test.ts tests/navigation/tree-map-view-model.test.ts tests/navigation/results-route.test.ts tests/state/progress-store.test.ts tests/state/player-helpers.test.ts`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 2: Run a manual checklist in the Expo app**

Verify:

- open from home goes to `/map`
- active band rests in the lower-middle zone
- completed levels show a marker
- current level glows/pulses
- locked levels show as buds
- finishing level 5 returns to `/map?focusLevel=6&revealBandStart=6`
- the canopy opens and the camera drags upward

- [ ] **Step 3: Commit the verification-safe state**

```bash
git add app/map.tsx app/chapters.tsx src/navigation/tree-map-model.ts src/navigation/tree-map-focus.ts src/navigation/tree-map-view-model.ts src/components/tree-map-node.tsx src/components/tree-map-canopy.tsx src/components/tree-map-band.tsx src/components/tree-map-atmosphere.tsx src/navigation/results-route.ts src/game/assets/runtime-assets.ts src/game/assets/preload-assets.native.ts tests/navigation/tree-map-model.test.ts tests/navigation/tree-map-focus.test.ts tests/navigation/tree-map-view-model.test.ts tests/navigation/results-route.test.ts
git commit -m "feat: ship reusable tree map progression flow"
```

## Coverage Check

This plan covers:

- reusable 5-level bands
- sinuous trunk-side progression
- hybrid free scroll + refocus behavior
- current/completed/locked node states
- leaf-curtain gating
- next-band tease
- band-unlock reveal routing from results back to map
- route cleanup away from the old chapter screen

Deferred by design:

- branch hopping
- spiral climb
- cluster zones
- more advanced landmark generation
- richer particle-heavy reveal FX
