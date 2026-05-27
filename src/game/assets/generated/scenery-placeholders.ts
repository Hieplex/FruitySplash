import { createPlaceholderSource } from "./svg";
import type { GeneratedPlaceholderAsset } from "./types";

export const sceneryPlaceholderAssets = {
  menuBackground: {
    id: "background-menu",
    category: "background",
    title: "Menu Orchard Morning",
    palette: ["#FFF7EF", "#FFE6C9", "#F6C981", "#B8E0A5", "#74B998"],
    tags: ["background", "menu", "orchard", "fresh", "soft"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 2560'>
        <defs>
          <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stop-color='#FFF8EF'/>
            <stop offset='45%' stop-color='#FFE7CC'/>
            <stop offset='100%' stop-color='#FFD49A'/>
          </linearGradient>
          <linearGradient id='hill' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stop-color='#A9D899'/>
            <stop offset='100%' stop-color='#7EBF8A'/>
          </linearGradient>
        </defs>
        <rect width='1440' height='2560' fill='url(#sky)'/>
        <circle cx='1120' cy='390' r='150' fill='#FFF4CF' opacity='.9'/>
        <path d='M0 1450c210-120 430-140 620-60 150 63 290 70 420 20 160-62 290-45 400 25v1125H0V1450Z' fill='url(#hill)'/>
        <path d='M0 1700c180-84 350-90 510-16 184 84 362 86 520 10 152-72 289-72 410-2v868H0v-860Z' fill='#74B998'/>
        <g opacity='.4'>
          <circle cx='250' cy='640' r='70' fill='#FFD78C'/>
          <circle cx='1180' cy='840' r='50' fill='#FFC96D'/>
          <circle cx='490' cy='1030' r='56' fill='#FFD78C'/>
        </g>
        <g fill='none' stroke='#FFFFFF' stroke-width='22' opacity='.34'>
          <path d='M140 520c120 65 220 74 320 25'/>
          <path d='M870 630c110 52 210 49 312-8'/>
          <path d='M560 880c95 44 191 42 286-6'/>
        </g>
      </svg>
      `,
      1440,
      2560,
    ),
    prompt: {
      title: "Menu background direction",
      prompt:
        "A portrait mobile game menu background for a match-3 fruit puzzle, soft orchard morning atmosphere, light bright inviting palette, distant rolling hills, warm sun glow, subtle fruit blossom accents, clean open center space for UI, polished casual game illustration, no text, no characters.",
      negativePrompt:
        "dark scene, busy foreground, candy land, houses, characters, hard outlines, text, watermark, cluttered center",
      notes: [
        "Reserve the middle third for buttons and logo readability.",
        "Depth should come from gentle layers, not detailed scenery.",
      ],
      targetUsage: "Home menu and pre-level entry screens",
      recommendedSize: "1536x2732 portrait JPG or PNG",
    },
    replacementPath: "src/game/assets/generated/menu-background.png",
  },
  mapBackground: {
    id: "background-map",
    category: "background",
    title: "Map Meadow Path",
    palette: ["#ECF8E6", "#CFEFB8", "#8FC978", "#6CB0C8", "#FFE8A6"],
    tags: ["background", "map", "meadow", "path", "progression"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 2560'>
        <defs>
          <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stop-color='#F6FFF2'/>
            <stop offset='100%' stop-color='#D9F5C4'/>
          </linearGradient>
        </defs>
        <rect width='1440' height='2560' fill='url(#sky)'/>
        <path d='M-80 2160c160-430 398-710 712-840 233-96 458-299 682-636l126 1876H0Z' fill='#8BC978'/>
        <path d='M1040 60c126 212 205 405 238 579 40 213 8 429-100 648-91 186-224 372-400 558-122 130-300 312-534 547l-187-133c243-230 431-415 563-555 183-193 315-377 395-551 96-208 125-404 90-588-29-149-98-318-208-506Z' fill='#FCE7A0'/>
        <path d='M1094 132c92 162 152 313 180 454 33 172 9 348-75 527-83 178-205 351-364 520-102 108-248 258-437 449' fill='none' stroke='#FFFFFF' stroke-width='36' stroke-linecap='round' opacity='.5'/>
        <g opacity='.55'>
          <circle cx='264' cy='392' r='74' fill='#B9E0FF'/>
          <circle cx='1185' cy='774' r='58' fill='#B9E0FF'/>
          <circle cx='446' cy='1310' r='66' fill='#FFEAAE'/>
          <circle cx='1094' cy='1832' r='83' fill='#FFEAAE'/>
        </g>
      </svg>
      `,
      1440,
      2560,
    ),
    prompt: {
      title: "Map background direction",
      prompt:
        "A portrait level-map background for a fruit puzzle game, soft meadow and orchard landscape, winding pale path designed for level nodes, bright clean daylight, fresh natural fruit theme, simple layered scenery, plenty of negative space for map buttons, polished casual game art, no text, no characters.",
      negativePrompt:
        "isometric city, dark forest, heavy detail, houses, vehicles, candy world, text, watermark, cluttered route",
      notes: [
        "Path should remain clearly readable even under level badges.",
        "Use landmark color spots sparingly so nodes stay the focus.",
      ],
      targetUsage: "Scrollable level progression map",
      recommendedSize: "1536x2732 portrait JPG or PNG",
    },
    replacementPath: "src/game/assets/generated/map-background.png",
  },
} as const satisfies Record<string, GeneratedPlaceholderAsset>;

export const uiPlaceholderAssets = {
  stars: {
    id: "ui-stars",
    category: "ui",
    title: "Golden Reward Stars",
    palette: ["#F5C84C", "#FFE59A", "#FFF6D3", "#E19E20", "#FFFFFF"],
    tags: ["ui", "stars", "rewards", "results"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 256'>
        <defs>
          <linearGradient id='gold' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#FFF3B6'/>
            <stop offset='100%' stop-color='#E6A829'/>
          </linearGradient>
        </defs>
        <rect width='512' height='256' rx='56' fill='#FFF8E4'/>
        <g transform='translate(32 26)'>
          <g transform='translate(0 8) scale(.9)'>
            <path d='M64 0 82 37 124 43 94 72 101 114 64 94 27 114 34 72 4 43 46 37Z' fill='url(#gold)'/>
          </g>
          <g transform='translate(128 0)'>
            <path d='M96 0 122 53 180 61 138 102 148 162 96 134 44 162 54 102 12 61 70 53Z' fill='url(#gold)'/>
          </g>
          <g transform='translate(308 8) scale(.9)'>
            <path d='M64 0 82 37 124 43 94 72 101 114 64 94 27 114 34 72 4 43 46 37Z' fill='url(#gold)'/>
          </g>
          <g fill='#FFFFFF' opacity='.8'>
            <circle cx='90' cy='54' r='7'/>
            <circle cx='227' cy='65' r='10'/>
            <circle cx='390' cy='54' r='7'/>
          </g>
        </g>
      </svg>
      `,
      512,
      256,
    ),
    prompt: {
      title: "Star reward direction",
      prompt:
        "Three polished reward stars for a mobile fruit puzzle game, warm gold material, soft creamy highlights, rounded friendly points, subtle depth, premium casual game UI style, isolated on transparent background, no text.",
      negativePrompt:
        "sharp metallic spikes, silver stars, childish clipart, dark outline, text, watermark, space theme",
      notes: [
        "Center star can be slightly larger for a win screen hero treatment.",
        "Keep the points broad and safe-looking rather than sharp.",
      ],
      targetUsage: "Level completion, map badges, score summaries",
      recommendedSize: "1024x512 transparent PNG",
    },
    replacementPath: "src/game/assets/generated/stars.png",
  },
} as const satisfies Record<string, GeneratedPlaceholderAsset>;
