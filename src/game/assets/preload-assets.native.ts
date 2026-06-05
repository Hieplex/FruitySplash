import { Asset } from 'expo-asset';
import {
  backgroundRuntimeAssets,
  barRuntimeAssets,
  challengeRuntimeAssets,
  coinRuntimeAssets,
  fruitRuntimeAssets,
  scoreNumberRuntimeAssets,
  scoreNumberSpriteAsset,
  treeMapRuntimeAssets,
  uiRuntimeAssets,
} from '@/game/assets/runtime-assets';

const chapterBackground = require('../../../assets/Chapter/ChapterBackground.png');
const chapterSweetGrove = require('../../../assets/Chapter/SweetGrove .png');
const chapterCitrusLocked = require('../../../assets/Chapter/Locked/CitrusMeadow.png');
const chapterGrapeLocked = require('../../../assets/Chapter/Locked/GrapeHaven.png');
const chapterMelonLocked = require('../../../assets/Chapter/Locked/MelonBay.png');
const chapterPineappleLocked = require('../../../assets/Chapter/Locked/PineappleCove.png');
const chapterBerryLocked = require('../../../assets/Chapter/Locked/BerryBloom.png');

const chapterFruitRainAssets = [
  require('../../../assets/Chapter/Fruits/Apple.png'),
  require('../../../assets/Chapter/Fruits/Banana.png'),
  require('../../../assets/Chapter/Fruits/Blueberry.png'),
  require('../../../assets/Chapter/Fruits/Cherry.png'),
  require('../../../assets/Chapter/Fruits/Coconut.png'),
  require('../../../assets/Chapter/Fruits/DragonFruit.png'),
  require('../../../assets/Chapter/Fruits/Grapes.png'),
  require('../../../assets/Chapter/Fruits/Kiwi.png'),
  require('../../../assets/Chapter/Fruits/Lemon.png'),
  require('../../../assets/Chapter/Fruits/Lychee.png'),
  require('../../../assets/Chapter/Fruits/Mango.png'),
  require('../../../assets/Chapter/Fruits/Orange.png'),
  require('../../../assets/Chapter/Fruits/Peach.png'),
  require('../../../assets/Chapter/Fruits/Pear.png'),
  require('../../../assets/Chapter/Fruits/Pineapple.png'),
  require('../../../assets/Chapter/Fruits/Strawberry.png'),
  require('../../../assets/Chapter/Fruits/Watermelon.png'),
] as const;

const gameplaySettingsButtonImage = require('../../../assets/fruity/Buttons/SettingScreen/SettingButton.png');
const gameplaySettingsScreenImage = require('../../../assets/fruity/Buttons/SettingScreen/ScreenSetting.png');
const gameplaySettingsExitImage = require('../../../assets/fruity/Buttons/SettingScreen/Exit.png');

const startupAssets = [
  backgroundRuntimeAssets.menu,
  backgroundRuntimeAssets.map,
  uiRuntimeAssets.gameLogo,
  uiRuntimeAssets.buttonPlay,
  uiRuntimeAssets.buttonExit,
  chapterBackground,
  chapterSweetGrove,
  chapterCitrusLocked,
  chapterGrapeLocked,
  chapterMelonLocked,
  chapterPineappleLocked,
  chapterBerryLocked,
  coinRuntimeAssets.icon,
  ...Object.values(coinRuntimeAssets.digits),
  ...challengeRuntimeAssets.slice(0, 10),
] as const;

const chapterDecorAssets = [...chapterFruitRainAssets] as const;

const gameplayAssets = [
  backgroundRuntimeAssets.gameplay,
  gameplaySettingsButtonImage,
  gameplaySettingsScreenImage,
  gameplaySettingsExitImage,
  uiRuntimeAssets.gameplayHomeButton,
  uiRuntimeAssets.gameplayMapButton,
  uiRuntimeAssets.gameplayBombButton,
  uiRuntimeAssets.gameplayBombDrop,
  uiRuntimeAssets.gameplayHammerButton,
  uiRuntimeAssets.navigatorBar,
  barRuntimeAssets.score,
  barRuntimeAssets.moves,
  barRuntimeAssets.progress,
  barRuntimeAssets.progressFill,
  barRuntimeAssets.emptyStar,
  barRuntimeAssets.fullStar,
  scoreNumberSpriteAsset,
  ...Object.values(fruitRuntimeAssets),
  ...Object.values(scoreNumberRuntimeAssets),
] as const;

const treeMapAssets = Object.values(treeMapRuntimeAssets) as readonly number[];

const warmedAssetGroups = new Set<string>();

async function warmAssetGroup(key: string, assets: readonly number[]) {
  if (warmedAssetGroups.has(key)) {
    return;
  }

  warmedAssetGroups.add(key);

  try {
    await Asset.loadAsync([...assets]);
  } catch (error) {
    warmedAssetGroups.delete(key);
    console.warn(`[assets] Failed to warm ${key} asset group`, error);
  }
}

export function warmStartupAssets() {
  return warmAssetGroup('startup', startupAssets);
}

export function warmChapterDecorAssets() {
  return warmAssetGroup('chapterDecor', chapterDecorAssets);
}

export function warmGameplayAssets() {
  return warmAssetGroup('gameplay', gameplayAssets);
}

export function warmTreeMapAssets() {
  return warmAssetGroup('treeMap', treeMapAssets);
}
