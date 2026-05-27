import { createPlaceholderSource } from "./svg";
import type { GeneratedPlaceholderAsset } from "./types";

export const brandingPlaceholderAssets = {
  appIcon: {
    id: "branding-app-icon",
    category: "branding",
    title: "Fruity Splash App Icon",
    palette: ["#FF8F3D", "#F04C6C", "#F5D349", "#7ABF54", "#FFF7EA"],
    tags: ["branding", "icon", "launcher", "fruit"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#FFF8E8'/>
            <stop offset='45%' stop-color='#FFD998'/>
            <stop offset='100%' stop-color='#FFAA64'/>
          </linearGradient>
        </defs>
        <rect width='1024' height='1024' rx='240' fill='url(#bg)'/>
        <circle cx='302' cy='430' r='148' fill='#F04C6C'/>
        <circle cx='534' cy='344' r='156' fill='#FF9E34'/>
        <ellipse cx='700' cy='568' rx='154' ry='144' fill='#F5D349'/>
        <circle cx='432' cy='672' r='142' fill='#7ABF54'/>
        <circle cx='662' cy='710' r='112' fill='#6377D9'/>
        <path d='M236 250c74 14 141 47 211 102-89 11-160 2-244-36 8-24 18-46 33-66Z' fill='#72B95A'/>
        <path d='M523 174c55 15 104 48 146 101-71 6-129-5-176-29 4-29 14-53 30-72Z' fill='#5FA74B'/>
        <g fill='#FFFFFF' opacity='.35'>
          <circle cx='372' cy='326' r='28'/>
          <circle cx='603' cy='272' r='32'/>
          <circle cx='768' cy='491' r='24'/>
        </g>
      </svg>
      `,
      1024,
      1024,
    ),
    prompt: {
      title: "App icon direction",
      prompt:
        "A premium mobile app icon for a match-3 game called Fruity Splash, fresh natural fruit theme, cluster of five distinct fruits arranged in a tight joyful composition, bright creamy background, glossy but not candy-coated, bold readable shapes at small launcher size, polished casual game icon, no text, no border.",
      negativePrompt:
        "logo text, mascot face, dark background, neon candy style, cluttered scene, tiny details, watermark",
      notes: [
        "The icon should read as fruit first, not as a landscape or badge.",
        "Leave a little breathing room around the cluster for platform masks.",
      ],
      targetUsage: "iOS and Android launcher icon source",
      recommendedSize: "1024x1024 square PNG",
    },
    replacementPath: "src/game/assets/generated/app-icon-source.png",
  },
  splash: {
    id: "branding-splash",
    category: "branding",
    title: "Fruity Splash Title Screen Art",
    palette: ["#FFF8EF", "#FFDC9B", "#F5735B", "#7CC36A", "#5E8DE2"],
    tags: ["branding", "splash", "title", "hero"],
    source: createPlaceholderSource(
      `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 2560'>
        <defs>
          <linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stop-color='#FFF9EF'/>
            <stop offset='50%' stop-color='#FFE2AE'/>
            <stop offset='100%' stop-color='#FFC990'/>
          </linearGradient>
        </defs>
        <rect width='1440' height='2560' fill='url(#bg)'/>
        <circle cx='1140' cy='330' r='170' fill='#FFF2CE' opacity='.92'/>
        <g transform='translate(170 660)'>
          <circle cx='180' cy='460' r='152' fill='#F46266'/>
          <circle cx='435' cy='285' r='168' fill='#FFA43A'/>
          <ellipse cx='730' cy='500' rx='170' ry='156' fill='#F2D34E'/>
          <circle cx='456' cy='730' r='152' fill='#79BF5E'/>
          <circle cx='760' cy='790' r='122' fill='#6886E2'/>
          <g fill='#FFFFFF' opacity='.34'>
            <circle cx='300' cy='350' r='26'/>
            <circle cx='580' cy='240' r='30'/>
            <circle cx='840' cy='460' r='24'/>
          </g>
        </g>
        <g fill='none' stroke-linecap='round' opacity='.32'>
          <path d='M232 490c188 92 404 92 648 0' stroke='#FFFFFF' stroke-width='22'/>
          <path d='M1002 1380c96 50 150 122 162 216' stroke='#F6A45C' stroke-width='18'/>
          <path d='M250 1620c106-78 223-110 352-96' stroke='#F6A45C' stroke-width='18'/>
        </g>
      </svg>
      `,
      1440,
      2560,
    ),
    prompt: {
      title: "Splash screen direction",
      prompt:
        "A portrait splash screen artwork for a mobile match-3 fruit game, uplifting fresh natural fruit cluster, soft sunrise palette, bright inviting background, room in the upper-middle area for the Fruity Splash logo, light juicy energy without candy excess, polished casual game hero art, no text, no characters.",
      negativePrompt:
        "dark dramatic scene, candy world, mascot character, heavy shadows, logo text baked in, watermark, cluttered background",
      notes: [
        "Keep a calm bright center band where the title can sit cleanly.",
        "Fruit should feel dimensional and celebratory but not explosive.",
      ],
      targetUsage: "Startup splash, title screen hero, store promo basis",
      recommendedSize: "1536x2732 portrait PNG",
    },
    replacementPath: "src/game/assets/generated/splash-art.png",
  },
} as const satisfies Record<string, GeneratedPlaceholderAsset>;
