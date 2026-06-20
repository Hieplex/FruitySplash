import { Asset } from 'expo-asset';
import {
  backgroundRuntimeAssets,
  barRuntimeAssets,
  challengeRuntimeAssets,
  coinRuntimeAssets,
  fruitRuntimeAssets,
  scoreNumberSpriteAsset,
  soundRuntimeAssets,
  specialFruitRuntimeAssets,
  treeMapRuntimeAssets,
  uiRuntimeAssets,
  vfxRuntimeAssets,
} from '@/game/assets/runtime-assets';

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
const shopIconImage = require('../../../assets/Shop/ShopIcon.png');
const shopBackgroundImage = require('../../../assets/Shop/ShopBackground.png');
const shopTitleRibbonImage = require('../../../assets/Shop/RibbonTitle.png');
const shopBuyButtonImage = require('../../../assets/Shop/BuyButton.png');
const avatarFrameImage = require('../../../assets/Avatar/AvatarFrame.png');

const gameplaySettingsButtonImage = require('../../../assets/fruity/Buttons/SettingScreen/SettingButton.png');
const gameplaySettingsScreenImage = require('../../../assets/fruity/Buttons/SettingScreen/ScreenSetting.png');
const gameplaySettingsExitImage = require('../../../assets/fruity/Buttons/SettingScreen/Exit.png');
const settingsShakingImage = require('../../../assets/fruity/Buttons/SettingScreen/Shaking.png');
const settingsSoundImage = require('../../../assets/fruity/Buttons/SettingScreen/Sound.png');
const settingsVfxImage = require('../../../assets/fruity/Buttons/SettingScreen/VFX.png');
const settingsVolumeBarImage = require('../../../assets/fruity/Buttons/SettingScreen/volumebar.png');
const settingsVolumeActiveImage = require('../../../assets/fruity/Buttons/SettingScreen/volumeactive.png');
const settingsVolumeThumbImage = require('../../../assets/fruity/Buttons/SettingScreen/volumethumb.png');

const startupAssets = [
  backgroundRuntimeAssets.menu,
  uiRuntimeAssets.gameLogo,
  uiRuntimeAssets.buttonPlay,
  uiRuntimeAssets.buttonExit,
] as const;

const gameplayAssets = [
  backgroundRuntimeAssets.gameplay,
  gameplaySettingsButtonImage,
  gameplaySettingsScreenImage,
  gameplaySettingsExitImage,
  uiRuntimeAssets.gameplayHomeButton,
  uiRuntimeAssets.gameplayMapButton,
  soundRuntimeAssets.matchEffect,
  uiRuntimeAssets.gameplayBombButton,
  uiRuntimeAssets.gameplayBombDrop,
  uiRuntimeAssets.gameplayBombExploded,
  soundRuntimeAssets.bombEffect,
  uiRuntimeAssets.gameplayHammerButton,
  uiRuntimeAssets.gameplayLineRocketButton,
  uiRuntimeAssets.gameplayLineRocketImage,
  uiRuntimeAssets.gameplayLineRocketThrustBig,
  uiRuntimeAssets.gameplayLineRocketThrustSmall,
  soundRuntimeAssets.lineRocketEffect,
  uiRuntimeAssets.gameplayFruityCrossButton,
  uiRuntimeAssets.gameplayFruityCrossGroup,
  uiRuntimeAssets.gameplayFruityCrossTop,
  uiRuntimeAssets.gameplayFruityCrossDown,
  uiRuntimeAssets.gameplayFruityCrossLeft,
  uiRuntimeAssets.gameplayFruityCrossRight,
  soundRuntimeAssets.fruityCrossEffect,
  uiRuntimeAssets.gameplayLightningFruitsButton,
  uiRuntimeAssets.gameplayLightningComeDown,
  uiRuntimeAssets.gameplayGroundLightning,
  soundRuntimeAssets.lightningEffect,
  soundRuntimeAssets.gameplayBackgroundMusic,
  uiRuntimeAssets.finishContinueButton,
  uiRuntimeAssets.navigatorBar,
  barRuntimeAssets.score,
  barRuntimeAssets.moves,
  barRuntimeAssets.progress,
  barRuntimeAssets.progressFill,
  barRuntimeAssets.emptyStar,
  barRuntimeAssets.fullStar,
  scoreNumberSpriteAsset,
  ...Object.values(fruitRuntimeAssets),
  ...Object.values(specialFruitRuntimeAssets).flatMap((assets) => Object.values(assets)),
  vfxRuntimeAssets.splashBurst,
  vfxRuntimeAssets.splashDroplet,
  vfxRuntimeAssets.splashSparkle,
  vfxRuntimeAssets.mysteryCloud,
  vfxRuntimeAssets.bombShockwave,
  ...Object.values(vfxRuntimeAssets.seedSparkByFruit),
] as const;

const treeMapAssets = [
  ...Object.values(treeMapRuntimeAssets),
  ...chapterFruitRainAssets,
  shopIconImage,
  shopBackgroundImage,
  shopTitleRibbonImage,
  shopBuyButtonImage,
  avatarFrameImage,
  gameplaySettingsButtonImage,
  gameplaySettingsScreenImage,
  gameplaySettingsExitImage,
  settingsShakingImage,
  settingsSoundImage,
  settingsVfxImage,
  settingsVolumeBarImage,
  settingsVolumeActiveImage,
  settingsVolumeThumbImage,
  uiRuntimeAssets.gameplayBombButton,
  uiRuntimeAssets.gameplayLineRocketButton,
  uiRuntimeAssets.gameplayFruityCrossButton,
  uiRuntimeAssets.gameplayLightningFruitsButton,
  uiRuntimeAssets.buttonSettings,
  coinRuntimeAssets.icon,
  ...Object.values(coinRuntimeAssets.digits),
  ...challengeRuntimeAssets,
] as const;

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

export function warmGameplayAssets() {
  return warmAssetGroup('gameplay', gameplayAssets);
}

export function warmTreeMapAssets() {
  return warmAssetGroup('treeMap', treeMapAssets);
}
