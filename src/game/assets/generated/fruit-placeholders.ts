import { createPlaceholderSource } from "./svg";
import type { GeneratedPlaceholderAsset } from "./types";

const tileSize = 256;

export const fruitOrder = [
  "strawberry",
  "orange",
  "lemon",
  "kiwi",
  "blueberry",
] as const;

export type FruitAssetId = (typeof fruitOrder)[number];

export const fruitPlaceholderAssets: Record<FruitAssetId, GeneratedPlaceholderAsset> = {
  strawberry: {
    id: "fruit-strawberry",
    category: "fruit",
    title: "Morning Strawberry",
    palette: ["#D83A5B", "#F36C7D", "#FFD7DC", "#3F8F47", "#F8F5EF"],
    tags: ["fruit", "tile", "fresh", "seeded", "leafy"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#FFF7F0'/>
            <stop offset='100%' stop-color='#FFDAD7'/>
          </linearGradient>
          <radialGradient id='berry' cx='45%' cy='34%' r='64%'>
            <stop offset='0%' stop-color='#FF97A6'/>
            <stop offset='100%' stop-color='#C92E52'/>
          </radialGradient>
        </defs>
        <rect width='256' height='256' rx='64' fill='url(#bg)'/>
        <ellipse cx='128' cy='208' rx='60' ry='18' fill='#EAB0AE' opacity='.35'/>
        <path d='M78 82c17-18 35-27 50-27s33 9 50 27c18 19 28 43 28 68 0 42-35 76-78 76s-78-34-78-76c0-25 10-49 28-68Z' fill='url(#berry)'/>
        <path d='M128 54c11 0 19 9 19 20 0 15-13 27-19 37-6-10-19-22-19-37 0-11 8-20 19-20Z' fill='#F4EFF0'/>
        <path d='M80 67c18 6 33 16 48 31-23 4-40 1-59-9 3-8 6-15 11-22Z' fill='#49A35A'/>
        <path d='M176 67c-18 6-33 16-48 31 23 4 40 1 59-9-3-8-6-15-11-22Z' fill='#378B47'/>
        <path d='M127 61c7 5 12 13 16 23-12-3-20-3-31 0 3-10 8-18 15-23Z' fill='#5FB869'/>
        <g fill='#F8E5A2'>
          <ellipse cx='92' cy='111' rx='4' ry='7' transform='rotate(-18 92 111)'/>
          <ellipse cx='121' cy='106' rx='4' ry='7' transform='rotate(10 121 106)'/>
          <ellipse cx='149' cy='111' rx='4' ry='7' transform='rotate(-8 149 111)'/>
          <ellipse cx='171' cy='126' rx='4' ry='7' transform='rotate(22 171 126)'/>
          <ellipse cx='101' cy='139' rx='4' ry='7' transform='rotate(16 101 139)'/>
          <ellipse cx='129' cy='138' rx='4' ry='7' transform='rotate(-5 129 138)'/>
          <ellipse cx='156' cy='141' rx='4' ry='7' transform='rotate(14 156 141)'/>
          <ellipse cx='87' cy='166' rx='4' ry='7' transform='rotate(-12 87 166)'/>
          <ellipse cx='114' cy='169' rx='4' ry='7' transform='rotate(24 114 169)'/>
          <ellipse cx='141' cy='171' rx='4' ry='7' transform='rotate(-12 141 171)'/>
          <ellipse cx='167' cy='164' rx='4' ry='7' transform='rotate(10 167 164)'/>
        </g>
      </svg>
      `,
      tileSize,
      tileSize,
    ),
    prompt: {
      title: "Strawberry tile direction",
      prompt:
        "A fresh whole strawberry tile icon for a mobile match-3 game, natural produce styling, leafy crown, visible seeds, bright soft daylight, centered single fruit, rounded silhouette, crisp edges at small size, subtle splashy highlight, premium casual game rendering, no text, isolated on transparent background.",
      negativePrompt:
        "candy glaze, anthropomorphic face, sliced fruit, muddy texture, harsh neon, busy background, multiple fruits, watermark, text",
      notes: [
        "Keep the berry fuller at the bottom so the silhouette reads instantly at tile scale.",
        "Leaves should be compact and not widen beyond the fruit body.",
      ],
      targetUsage: "Board tile, HUD previews, level goals",
      recommendedSize: "1024x1024 transparent PNG",
    },
    replacementPath: "src/game/assets/generated/fruit-strawberry.png",
  },
  orange: {
    id: "fruit-orange",
    category: "fruit",
    title: "Sunlit Orange",
    palette: ["#F08A18", "#FFB347", "#FFE4B5", "#2E9A59", "#FFF7EC"],
    tags: ["fruit", "tile", "citrus", "round", "natural"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#FFF8EC'/>
            <stop offset='100%' stop-color='#FFE3BE'/>
          </linearGradient>
          <radialGradient id='fruit' cx='38%' cy='32%' r='62%'>
            <stop offset='0%' stop-color='#FFC35C'/>
            <stop offset='100%' stop-color='#E97810'/>
          </radialGradient>
        </defs>
        <rect width='256' height='256' rx='64' fill='url(#bg)'/>
        <ellipse cx='128' cy='208' rx='58' ry='18' fill='#E0B678' opacity='.28'/>
        <circle cx='128' cy='132' r='76' fill='url(#fruit)'/>
        <circle cx='128' cy='132' r='67' fill='none' stroke='#F6A63E' stroke-width='6' opacity='.75'/>
        <path d='M121 58c11-4 23-2 31 5 10 8 13 19 11 33-10-9-26-12-42-9 0-12 0-22 0-29Z' fill='#3A9A52'/>
        <path d='M142 56c12 5 21 14 27 28-13 1-24 0-35-5 0-10 3-18 8-23Z' fill='#51B36D'/>
        <g stroke='#FFD38A' stroke-width='4' stroke-linecap='round' opacity='.55'>
          <path d='M128 74v23'/>
          <path d='M128 167v23'/>
          <path d='M70 132h23'/>
          <path d='M163 132h23'/>
          <path d='M88 92l17 17'/>
          <path d='M151 155l17 17'/>
          <path d='M88 172l17-17'/>
          <path d='M151 109l17-17'/>
        </g>
      </svg>
      `,
      tileSize,
      tileSize,
    ),
    prompt: {
      title: "Orange tile direction",
      prompt:
        "A ripe whole orange tile icon for a mobile match-3 game, realistic citrus skin with gentle pores, warm natural orange color, one green leaf near the stem, bright clean lighting, centered fruit, polished casual game illustration, readable at small size, transparent background.",
      negativePrompt:
        "juice splash explosion, peeled orange, orange slices, cartoon face, dark background, candy coating, text, watermark",
      notes: [
        "Texture should suggest real rind without becoming noisy.",
        "Shape stays nearly round with only a slight stem indentation.",
      ],
      targetUsage: "Board tile, combo goal badge",
      recommendedSize: "1024x1024 transparent PNG",
    },
    replacementPath: "src/game/assets/generated/fruit-orange.png",
  },
  lemon: {
    id: "fruit-lemon",
    category: "fruit",
    title: "Zesty Lemon",
    palette: ["#F3D145", "#FFE986", "#FFF8CB", "#8CBF38", "#FFFCEB"],
    tags: ["fruit", "tile", "lemon", "oval", "bright"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#FFFCE7'/>
            <stop offset='100%' stop-color='#FFF1A8'/>
          </linearGradient>
          <radialGradient id='fruit' cx='42%' cy='34%' r='62%'>
            <stop offset='0%' stop-color='#FFF08F'/>
            <stop offset='100%' stop-color='#E6C42A'/>
          </radialGradient>
        </defs>
        <rect width='256' height='256' rx='64' fill='url(#bg)'/>
        <ellipse cx='128' cy='208' rx='58' ry='18' fill='#DCCB6A' opacity='.25'/>
        <path d='M62 136c0-44 31-76 66-76 14 0 25 6 36 17 14 14 30 24 30 59s-16 45-30 59c-11 11-22 17-36 17-35 0-66-32-66-76Z' fill='url(#fruit)'/>
        <path d='M189 106c10 9 20 21 20 30s-10 21-20 30c-5-17-5-43 0-60Z' fill='#F2D655'/>
        <path d='M126 63c11-11 23-14 36-8-4 11-11 20-22 28-8-7-13-13-14-20Z' fill='#8FC247'/>
        <path d='M79 109c30-18 63-21 101-7' stroke='#FFF4AA' stroke-width='7' stroke-linecap='round' opacity='.6'/>
        <path d='M74 139c33-13 67-15 106-6' stroke='#FFF4AA' stroke-width='7' stroke-linecap='round' opacity='.55'/>
        <path d='M81 168c31-9 61-9 92-1' stroke='#FFF4AA' stroke-width='7' stroke-linecap='round' opacity='.45'/>
      </svg>
      `,
      tileSize,
      tileSize,
    ),
    prompt: {
      title: "Lemon tile direction",
      prompt:
        "A whole lemon tile icon for a mobile match-3 game, fresh natural produce look, elongated lemon silhouette with pointed ends, satin yellow skin, tiny leaf accent, bright clean lighting, isolated centered fruit, premium puzzle game rendering, transparent background.",
      negativePrompt:
        "cut lemon, lemonade glass, sticker outline, oversaturated neon yellow, glossy candy shell, face, text, watermark",
      notes: [
        "Emphasize the long lemon silhouette so it does not read like another orange.",
        "Highlights should feel satiny rather than glassy.",
      ],
      targetUsage: "Board tile, reward summary rows",
      recommendedSize: "1024x1024 transparent PNG",
    },
    replacementPath: "src/game/assets/generated/fruit-lemon.png",
  },
  kiwi: {
    id: "fruit-kiwi",
    category: "fruit",
    title: "Garden Kiwi",
    palette: ["#6E8E2E", "#98B947", "#C9E289", "#5B412B", "#F7F3E7"],
    tags: ["fruit", "tile", "kiwi", "green", "earthy"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#F8F4E9'/>
            <stop offset='100%' stop-color='#E4F1C6'/>
          </linearGradient>
          <radialGradient id='fruit' cx='38%' cy='32%' r='62%'>
            <stop offset='0%' stop-color='#A6C754'/>
            <stop offset='100%' stop-color='#728D33'/>
          </radialGradient>
        </defs>
        <rect width='256' height='256' rx='64' fill='url(#bg)'/>
        <ellipse cx='128' cy='208' rx='60' ry='18' fill='#B8C796' opacity='.28'/>
        <ellipse cx='128' cy='132' rx='77' ry='72' fill='#5A402B'/>
        <ellipse cx='128' cy='132' rx='69' ry='64' fill='url(#fruit)'/>
        <ellipse cx='128' cy='132' rx='26' ry='24' fill='#F3F0D4'/>
        <g fill='#E9F6B6' opacity='.95'>
          <path d='M128 80 136 103 128 126 120 103Z'/>
          <path d='M156 92 154 117 134 130 139 107Z'/>
          <path d='M175 118 158 136 132 137 151 123Z'/>
          <path d='M173 149 149 156 128 145 152 141Z'/>
          <path d='M156 173 133 165 126 145 145 160Z'/>
          <path d='M128 184 117 161 128 140 139 161Z'/>
          <path d='M98 173 111 150 130 145 122 165Z'/>
          <path d='M82 149 107 141 128 146 104 157Z'/>
          <path d='M81 118 106 123 124 136 98 137Z'/>
          <path d='M100 92 118 107 122 130 102 117Z'/>
        </g>
        <g fill='#2E271E'>
          <circle cx='128' cy='89' r='3'/>
          <circle cx='156' cy='99' r='3'/>
          <circle cx='173' cy='121' r='3'/>
          <circle cx='171' cy='148' r='3'/>
          <circle cx='155' cy='171' r='3'/>
          <circle cx='128' cy='181' r='3'/>
          <circle cx='99' cy='171' r='3'/>
          <circle cx='84' cy='148' r='3'/>
          <circle cx='83' cy='121' r='3'/>
          <circle cx='100' cy='99' r='3'/>
        </g>
      </svg>
      `,
      tileSize,
      tileSize,
    ),
    prompt: {
      title: "Kiwi tile direction",
      prompt:
        "A kiwi fruit tile icon for a mobile match-3 game, whole fruit exterior with a subtle sliced-read interior motif, earthy green and soft brown palette, natural produce styling, centered readable silhouette, bright inviting light, polished casual game art, transparent background.",
      negativePrompt:
        "messy cut fruit, realistic photo, muddy brown, alien texture, candy coating, character face, text, watermark",
      notes: [
        "Keep the kiwi fresher and brighter than a realistic supermarket brown.",
        "Interior seed read can be stylized as long as it stays clean at small size.",
      ],
      targetUsage: "Board tile, goal icon, map rewards",
      recommendedSize: "1024x1024 transparent PNG",
    },
    replacementPath: "src/game/assets/generated/fruit-kiwi.png",
  },
  blueberry: {
    id: "fruit-blueberry",
    category: "fruit",
    title: "Cool Blueberry",
    palette: ["#4F67C7", "#7C90F0", "#BFD0FF", "#4B6D47", "#F3F6FF"],
    tags: ["fruit", "tile", "berry", "blue", "cool"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#F5F8FF'/>
            <stop offset='100%' stop-color='#DDE6FF'/>
          </linearGradient>
          <radialGradient id='fruit' cx='38%' cy='32%' r='62%'>
            <stop offset='0%' stop-color='#95A7FF'/>
            <stop offset='100%' stop-color='#4A62C2'/>
          </radialGradient>
        </defs>
        <rect width='256' height='256' rx='64' fill='url(#bg)'/>
        <ellipse cx='128' cy='208' rx='54' ry='18' fill='#AEBDE7' opacity='.3'/>
        <circle cx='128' cy='132' r='72' fill='url(#fruit)'/>
        <circle cx='128' cy='132' r='61' fill='none' stroke='#6E85E2' stroke-width='6' opacity='.65'/>
        <path d='M128 90c8 8 14 11 25 13-8 9-12 16-13 27-7-8-14-10-26-11 8-8 11-14 14-29Z' fill='#D8E2FF'/>
        <circle cx='129' cy='118' r='18' fill='#6A82DE'/>
        <g fill='#D6E0FF' opacity='.75'>
          <circle cx='99' cy='100' r='8'/>
          <circle cx='88' cy='126' r='5'/>
          <circle cx='160' cy='91' r='7'/>
          <circle cx='171' cy='126' r='4'/>
        </g>
        <path d='M117 63c11-3 21-1 29 7-6 8-13 12-24 14-5-7-7-14-5-21Z' fill='#5B8D54'/>
      </svg>
      `,
      tileSize,
      tileSize,
    ),
    prompt: {
      title: "Blueberry tile direction",
      prompt:
        "A plump blueberry tile icon for a mobile match-3 game, natural berry bloom and crown detail, cool blue-violet palette, subtle leaf accent, bright soft lighting, centered single fruit, highly readable at small size, premium casual game render, transparent background.",
      negativePrompt:
        "grapes cluster, black berry, sugary candy shell, heavy photo noise, face, text, watermark, dark gloomy background",
      notes: [
        "The crown top should read clearly without becoming a star itself.",
        "Keep the blueberry lighter and fresher than navy so it stands apart from dark UI.",
      ],
      targetUsage: "Board tile, score streak icon",
      recommendedSize: "1024x1024 transparent PNG",
    },
    replacementPath: "src/game/assets/generated/fruit-blueberry.png",
  },
};
