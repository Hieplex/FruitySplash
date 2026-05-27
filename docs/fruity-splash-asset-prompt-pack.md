# Fruity Splash Asset Prompt Pack

This pack defines the placeholder art contract and the prompt direction for the first Fruity Splash asset set.

## Global direction

- Theme: fresh natural fruit, not candy.
- Lighting: bright soft daylight with gentle creamy highlights.
- Palette: light and inviting, with saturated fruit color held against soft neutral backgrounds.
- Shape language: rounded, readable, low-clutter silhouettes that survive small mobile sizes.
- Finish: polished casual game illustration, not photo-real and not flat clipart.

## Fruit roster

### Strawberry

- Identity: full heart-shaped berry with a compact leafy crown and visible seeds.
- Palette anchor: raspberry red, blush pink highlight, leafy green.
- Prompt:

```text
A fresh whole strawberry tile icon for a mobile match-3 game, natural produce styling, leafy crown, visible seeds, bright soft daylight, centered single fruit, rounded silhouette, crisp edges at small size, subtle splashy highlight, premium casual game rendering, no text, isolated on transparent background.
```

### Orange

- Identity: near-round citrus with subtle rind pores and one small leaf.
- Palette anchor: warm orange, golden highlight, fresh green leaf.
- Prompt:

```text
A ripe whole orange tile icon for a mobile match-3 game, realistic citrus skin with gentle pores, warm natural orange color, one green leaf near the stem, bright clean lighting, centered fruit, polished casual game illustration, readable at small size, transparent background.
```

### Lemon

- Identity: elongated lemon with pointed ends and satiny rind.
- Palette anchor: sunny yellow, pale cream highlight, green leaf accent.
- Prompt:

```text
A whole lemon tile icon for a mobile match-3 game, fresh natural produce look, elongated lemon silhouette with pointed ends, satin yellow skin, tiny leaf accent, bright clean lighting, isolated centered fruit, premium puzzle game rendering, transparent background.
```

### Kiwi

- Identity: bright earthy kiwi that hints at the sliced interior while still reading cleanly as a tile.
- Palette anchor: kiwi green, soft seed cream, warm brown edge.
- Prompt:

```text
A kiwi fruit tile icon for a mobile match-3 game, whole fruit exterior with a subtle sliced-read interior motif, earthy green and soft brown palette, natural produce styling, centered readable silhouette, bright inviting light, polished casual game art, transparent background.
```

### Blueberry

- Identity: plump single berry with a clear crown top and soft bloom.
- Palette anchor: cool blue-violet, powdery highlight, muted green leaf.
- Prompt:

```text
A plump blueberry tile icon for a mobile match-3 game, natural berry bloom and crown detail, cool blue-violet palette, subtle leaf accent, bright soft lighting, centered single fruit, highly readable at small size, premium casual game render, transparent background.
```

## Background direction

### Menu background

- Goal: calm orchard-morning stage for logo and primary CTA.
- Layout note: keep the center third visually open.
- Prompt:

```text
A portrait mobile game menu background for a match-3 fruit puzzle, soft orchard morning atmosphere, light bright inviting palette, distant rolling hills, warm sun glow, subtle fruit blossom accents, clean open center space for UI, polished casual game illustration, no text, no characters.
```

### Map background

- Goal: support a winding level path without stealing focus from nodes.
- Layout note: the route should remain readable under map badges.
- Prompt:

```text
A portrait level-map background for a fruit puzzle game, soft meadow and orchard landscape, winding pale path designed for level nodes, bright clean daylight, fresh natural fruit theme, simple layered scenery, plenty of negative space for map buttons, polished casual game art, no text, no characters.
```

## UI direction

### Stars

- Goal: broad friendly reward stars with soft gold material.
- Prompt:

```text
Three polished reward stars for a mobile fruit puzzle game, warm gold material, soft creamy highlights, rounded friendly points, subtle depth, premium casual game UI style, isolated on transparent background, no text.
```

## Branding direction

### App icon

- Goal: fruit-first launcher icon that still reads under platform masks.
- Layout note: keep a small breathing margin around the fruit cluster.
- Prompt:

```text
A premium mobile app icon for a match-3 game called Fruity Splash, fresh natural fruit theme, cluster of five distinct fruits arranged in a tight joyful composition, bright creamy background, glossy but not candy-coated, bold readable shapes at small launcher size, polished casual game icon, no text, no border.
```

### Splash art

- Goal: bright celebratory hero art with a clean title zone in the upper-middle area.
- Prompt:

```text
A portrait splash screen artwork for a mobile match-3 fruit game, uplifting fresh natural fruit cluster, soft sunrise palette, bright inviting background, room in the upper-middle area for the Fruity Splash logo, light juicy energy without candy excess, polished casual game hero art, no text, no characters.
```

## Negative prompt baseline

Use this baseline unless a specific prompt overrides it:

```text
candy glaze, anthropomorphic face, muddy texture, harsh neon, busy background, multiple fruits unless requested, watermark, text, logo baked in, low detail, dark dramatic lighting
```

## Replacement contract

- Keep manifest IDs stable once real generated images replace the placeholders.
- Replace each `replacementPath` in `src/game/assets/manifest.ts` with the final asset file the main agent adopts.
- Preserve transparent backgrounds for tile art, stars, and icon source.
- Preserve portrait framing for menu, map, and splash outputs.
- If multiple model passes are used, lock the fruit silhouettes first and only then refine shading and highlights.
