# FruitySplash TODO

## Still Worth Fixing Next

- [ ] Live visual QA: run the app and watch bomb, cascade, reshuffle, level win, and results flow on device/emulator.
- [ ] More `GameBoard` splitting: bomb VFX is still inside `game-board.tsx`; drop/reshuffle were extracted, but bomb effect can become `BombEffectLayer`.
- [ ] More `LevelScreen` splitting: session state is cleaner, but a real `useLevelSession` hook would make future boosters safer.
- [ ] Store UI is not built yet: coins/lives/inventory helpers exist, but no shop screen or purchase flow.
- [ ] Booster contract is not fully generic yet: bomb has inventory and sequencing, but future boosters still need a common definition system.
- [ ] HUD extraction: gameplay HUD is still mostly inline in `level/[id].tsx`.
- [ ] Economy tuning: default `bomb: 5`, first-clear `50` coins, and `5` lives are placeholders and need game-balance tuning.

## Boosters

- [ ] Show the current bomb count on or near the bomb button.
- [ ] Add feedback when the player taps the bomb button with zero bombs.
- [ ] Create a generic `BoosterDefinition` system with id, icon, cost, inventory key, targeting mode, resolver, and animation kind.
- [ ] Move bomb into the generic booster system.
- [ ] Add a simple second booster, likely single-tile hammer/spoon or row/column clear.
- [ ] Add tests for booster inventory consume/no-inventory behavior through gameplay helpers.
- [ ] Add pre-level booster selection later, after the in-level booster system is stable.

## Store, Coins, Lives

- [ ] Build a simple store screen for coin bundles and booster packs.
- [ ] Add UI for coins and lives.
- [ ] Tune default economy values: starting bombs, first-clear coin reward, life count, and booster prices.
- [ ] Add a reward ledger for future rewards beyond level first-clear.
- [ ] Add near-miss extra-moves flow after level failure.

## Gameplay Stability

- [ ] Run live visual QA on device/emulator for bomb, cascade, reshuffle, level win, retry, and results flow.
- [ ] Watch for animation overlap between bomb VFX, match splash, drop, and reshuffle.
- [ ] Better splash VFX.
- [ ] Add a forced dead-board/reshuffle test scenario that can be triggered in dev for visual checking.

## Refactor

- [ ] Extract `BombEffectLayer` from `src/components/game-board.tsx`.
- [ ] Extract gameplay HUD from `app/level/[id].tsx` into a dedicated component.
- [ ] Create a `useLevelSession` hook for level state, selection, lock state, win/loss, and booster actions.
- [ ] Keep match/cascade sequencing in `src/gameplay/match-cascade.ts` and avoid moving it back into the route file.
- [ ] Keep economy/player helpers pure and tested before wiring more UI.

## Future Match-3 Features

- [ ] Add grid-created powerups separate from inventory boosters.
- [ ] Add powerup combos.
- [ ] Add level goals beyond score, such as collect fruit, clear crates, ice, jam, or vines.
- [ ] Add lightweight daily reward/chest track after core gameplay is stable.
