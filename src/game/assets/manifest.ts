import {
  fruitOrder,
  fruitPlaceholderAssets,
  type FruitAssetId,
} from "./generated/fruit-placeholders";
import { brandingPlaceholderAssets } from "./generated/branding-placeholders";
import {
  sceneryPlaceholderAssets,
  uiPlaceholderAssets,
} from "./generated/scenery-placeholders";
import type { GeneratedPlaceholderAsset } from "./generated/types";

export type { AssetCategory, AssetPromptSpec, GeneratedPlaceholderAsset } from "./generated/types";
export type { FruitAssetId } from "./generated/fruit-placeholders";

export const assetPromptDocPath = "docs/fruity-splash-asset-prompt-pack.md" as const;

export const fruitAssetIds = fruitOrder;

export const fruitAssets: Record<FruitAssetId, GeneratedPlaceholderAsset> =
  fruitPlaceholderAssets;

export const backgroundAssets = sceneryPlaceholderAssets;

export const uiAssets = uiPlaceholderAssets;

export const brandingAssets = brandingPlaceholderAssets;

export const assetManifest = {
  promptDocPath: assetPromptDocPath,
  theme: {
    name: "Fresh Natural Fruit",
    principles: [
      "Prefer produce-like skin, seeds, leaves, and soft daylight over candy shine.",
      "Keep silhouettes distinct enough to read instantly on 8x6 board tiles.",
      "Favor light, open, inviting backgrounds with clear space for UI overlays.",
    ],
  },
  fruits: fruitAssets,
  backgrounds: backgroundAssets,
  ui: uiAssets,
  branding: brandingAssets,
} as const;

export const assetCatalog = [
  ...fruitAssetIds.map((id) => fruitAssets[id]),
  backgroundAssets.menuBackground,
  backgroundAssets.mapBackground,
  uiAssets.stars,
  brandingAssets.appIcon,
  brandingAssets.splash,
] as const;

export const assetLookup = Object.fromEntries(
  assetCatalog.map((asset) => [asset.id, asset]),
) as Record<(typeof assetCatalog)[number]["id"], GeneratedPlaceholderAsset>;
