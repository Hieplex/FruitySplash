# FruitySplash Tree Band Theme Scaling

Status: working design note

## Core rule

Do not treat each band as a custom screen.

Instead, separate the system into:

1. band structure
2. theme assignment
3. renderer

## Band structure

Each band is a reusable progression unit.

Current direction:

- `1 band = 5 levels`
- levels `1-5` = band `1`
- levels `6-10` = band `2`
- levels `11-15` = band `3`

The band only needs structural data, for example:

```ts
{
  bandIndex: 12,
  startLevel: 56,
  endLevel: 60,
  theme: 'default-tree'
}
```

This means the map grows by adding more level data, not by designing a new screen every time.

## Theme assignment

Themes should be handled as separate asset packs instead of hardcoded inside each band.

Examples:

- `default-tree`
- `christmas-tree`
- `halloween-tree`
- `spring-tree`
- `golden-heaven-tree`

Each theme pack can define:

- tree art
- root art
- sky/background art
- leaf curtain style
- socket decoration style
- particles or accent colors

## Renderer

The renderer should:

1. build bands from level count
2. look up which theme belongs to each band
3. render the correct art pack for that band

So the map logic stays the same while the visuals change by theme.

## Example scaling logic

If the game has `200` levels:

- `200 / 5 = 40 bands`

If `40` more levels are added later:

- `240 / 5 = 48 bands`

That means only `8` new bands are added structurally.

The important part is that those `8` bands should reuse the same renderer and just point to a theme pack.

## Example theme ranges

```ts
export const TREE_THEME_RANGES = [
  { startBand: 0, endBand: 7, theme: 'default' },
  { startBand: 8, endBand: 15, theme: 'christmas' },
];
```

This means:

- bands `1-8` use the default tree look
- bands `9-16` use the christmas tree look

The system does not need new map logic for the christmas update. It only needs:

1. new theme assets
2. a new assigned band range

## Practical update flow

To add more progression later:

1. add more levels
2. bands are generated automatically from those levels
3. assign the new band range to an existing or new theme pack

## Why this is the scalable version

This avoids:

- making one custom map screen per chapter
- rebuilding layout logic every time new content is added
- tying progression growth to heavy art production

This supports:

- 200+ levels
- seasonal visual updates
- christmas or event themes
- fast map expansion without rewriting the screen

## Current recommendation

Build the map as:

- one reusable tree band renderer
- one reusable root section
- one theme pack system
- one band-range assignment layer

Then future visual updates like `christmas` become a content-layer change, not a system rewrite.
