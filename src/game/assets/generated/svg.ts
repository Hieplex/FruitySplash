import type { PlaceholderSource } from "./types";

const compactSvg = (svg: string) =>
  svg
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();

export const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(compactSvg(svg))}`;

export const createPlaceholderSource = (
  svg: string,
  width: number,
  height: number,
): PlaceholderSource => ({
  svg: compactSvg(svg),
  uri: svgToDataUri(svg),
  width,
  height,
});
