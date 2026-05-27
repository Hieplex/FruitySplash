export type AssetCategory = "fruit" | "background" | "ui" | "branding";

export type AssetPromptSpec = {
  title: string;
  prompt: string;
  negativePrompt: string;
  notes: readonly string[];
  targetUsage: string;
  recommendedSize: string;
};

export type PlaceholderSource = {
  svg: string;
  uri: string;
  width: number;
  height: number;
};

export type GeneratedPlaceholderAsset = {
  id: string;
  category: AssetCategory;
  title: string;
  palette: readonly string[];
  tags: readonly string[];
  source: PlaceholderSource;
  prompt: AssetPromptSpec;
  replacementPath: string;
};
