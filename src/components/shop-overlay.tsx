import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { finishTransaction, useIAP, type Purchase } from 'expo-iap';
import { Animated, Image, Modal, Pressable, Text, View } from 'react-native';
import { coinRuntimeAssets, treeMapRuntimeAssets, uiRuntimeAssets } from '@/game/assets/runtime-assets';
import { COIN_PACK_PRODUCT_IDS, getCoinPackProduct } from '@/shop/coin-products';
import { useProgress } from '@/state/progress-store';
import type { BoosterId } from '@/state/progress-helpers';
import { spacing } from '@/theme/spacing';

const shopBackgroundImage = require('../../assets/Shop/ShopBackground.png');
const shopCloseImage = require('../../assets/fruity/Buttons/SettingScreen/Exit.png');
const shopTitleRibbonImage = require('../../assets/Shop/RibbonTitle.png');
const shopBuyButtonImage = require('../../assets/Shop/BuyButton.png');

const SHOP_PANEL_WIDTH_RATIO = 2;
const SHOP_PANEL_ASPECT_RATIO = 946 / 1662;
const SHOP_PANEL_MAX_HEIGHT_RATIO = 0.76;
const SHOP_PANEL_OFFSET_X = 0;
const SHOP_PANEL_OFFSET_Y = 0;
const SHOP_CLOSE_BUTTON_SIZE_RATIO = 0.13;
const SHOP_CLOSE_BUTTON_TOP_RATIO = 0.05;
const SHOP_CLOSE_BUTTON_RIGHT_RATIO = 0.01;

const SHOP_GRID_TOP_RATIO = 0.17;
const SHOP_GRID_SIDE_INSET_RATIO = 0.1;
const SHOP_GRID_COLUMN_GAP_RATIO = 0.035;
const SHOP_GRID_ROW_GAP_RATIO = 0.015;
const SHOP_CARD_HEIGHT_RATIO = 0.23;
const SHOP_CARD_RADIUS_RATIO = 0.03;
const SHOP_CARD_TITLE_RIBBON_WIDTH_RATIO = 2.4;
const SHOP_CARD_TITLE_RIBBON_HEIGHT_RATIO = 0.17;
const SHOP_CARD_TITLE_TOP_RATIO = -0.06;
const SHOP_CARD_ICON_SIZE_RATIO = 0.6;
const SHOP_CARD_ICON_TOP_RATIO = 0.2;
const SHOP_CARD_QUANTITY_TOP_RATIO = 0.62;
const SHOP_CARD_PRICE_BUTTON_WIDTH_RATIO = 0.80;
const SHOP_CARD_PRICE_BUTTON_HEIGHT_RATIO = 0.25;
const SHOP_CARD_PRICE_BUTTON_BOTTOM_RATIO = 0.015;
const SHOP_CARD_TITLE_TEXT_SIZE_RATIO = 0.09;
const SHOP_CARD_QUANTITY_TEXT_SIZE_RATIO = 0.1;
const SHOP_CARD_PRICE_TEXT_SIZE_RATIO = 0.15;
const SHOP_CARD_PRICE_TEXT_X_OFFSET_RATIO = -0.05;
const SHOP_CARD_PRICE_TEXT_Y_OFFSET_RATIO = 0.015;
const SHOP_CARD_CASH_PRICE_TEXT_X_OFFSET_RATIO = 0.012;
const SHOP_CARD_CASH_PRICE_TEXT_Y_OFFSET_RATIO = 0.115;
const SHOP_CARD_PRICE_COIN_ICON_SIZE_RATIO = 0.21;
const SHOP_CARD_PRICE_COIN_ICON_X_OFFSET_RATIO = -0.12;
const SHOP_CARD_PRICE_COIN_ICON_Y_OFFSET_RATIO = 0.04;
const SHOP_FOOTER_BAR_HEIGHT_RATIO = 0.09;
const SHOP_FOOTER_BAR_SIDE_INSET_RATIO = 0.2;
const SHOP_FOOTER_BAR_BOTTOM_RATIO = 0.034;
const SHOP_FOOTER_COIN_ICON_SIZE_RATIO = 0.09;
const SHOP_FOOTER_COIN_ICON_X_OFFSET_RATIO = 0.016;
const SHOP_FOOTER_COIN_ICON_Y_OFFSET_RATIO = 0.022;
const SHOP_FOOTER_TEXT_SIZE_RATIO = 0.07;
const SHOP_TEXT_COLOR = '#FFFFFF';
const SHOP_TEXT_OUTLINE = '#050203';
const SHOP_PRICE_TEXT_COLOR = '#F7FFF8';
const SHOP_CARD_TITLE_TEXT_TOP_NUDGE_RATIO = 0.012;
const SHOP_CARD_QUANTITY_TEXT_TOP_NUDGE_RATIO = -0.004;
const SHOP_CARD_PRICE_TEXT_TOP_NUDGE_RATIO = -0.03;

type ShopItem = {
  id: string;
  title: string;
  quantity: string;
  price: string;
  icon: number;
  boosterId?: BoosterId;
  coinCost?: number;
  boosterAmount?: number;
  coinPackProductId?: string;
  coinAmount?: number;
};

const shopItems: ShopItem[] = [
  {
    id: 'bomb_pack',
    title: 'Bomb',
    quantity: 'x3',
    price: '500',
    icon: uiRuntimeAssets.gameplayBombButton,
    boosterId: 'bomb',
    coinCost: 500,
    boosterAmount: 3,
  },
  {
    id: 'cross_pack',
    title: 'Fruity Cross',
    quantity: 'x3',
    price: '600',
    icon: uiRuntimeAssets.gameplayFruityCrossButton,
    boosterId: 'fruityCross',
    coinCost: 600,
    boosterAmount: 3,
  },
  {
    id: 'lightning_pack',
    title: 'Lightning Strike',
    quantity: 'x3',
    price: '550',
    icon: uiRuntimeAssets.gameplayLightningFruitsButton,
    boosterId: 'lightningFruits',
    coinCost: 550,
    boosterAmount: 3,
  },
  {
    id: 'rocket_pack',
    title: 'Rocket Line',
    quantity: 'x3',
    price: '700',
    icon: uiRuntimeAssets.gameplayLineRocketButton,
    boosterId: 'lineRocket',
    coinCost: 700,
    boosterAmount: 3,
  },
  { id: 'moves_pack', title: 'Extra Moves', quantity: 'x1', price: '400', icon: coinRuntimeAssets.icon },
  {
    id: 'coins_pack',
    title: 'Coins Pack',
    quantity: '10 000',
    price: '$1.99',
    icon: coinRuntimeAssets.icon,
    coinPackProductId: 'coins_10000',
    coinAmount: 10000,
  },
] as const;

type ShopOverlayLayout = {
  width: number;
  height: number;
};

type ShopOverlayProps = {
  visible: boolean;
  onClose: () => void;
  screenWidth: number;
  screenHeight: number;
};

function roundPixels(value: number) {
  return Math.round(value);
}

function scaledDimension(value: number, fallback = 1) {
  return Math.max(fallback, roundPixels(value));
}

function buildShopOverlayLayout(screenWidth: number, screenHeight: number): ShopOverlayLayout {
  const maxWidthFromScreen = screenWidth * SHOP_PANEL_WIDTH_RATIO;
  const maxWidthFromHeight = screenHeight * SHOP_PANEL_MAX_HEIGHT_RATIO * SHOP_PANEL_ASPECT_RATIO;
  const width = scaledDimension(Math.min(maxWidthFromScreen, maxWidthFromHeight));
  const height = scaledDimension(width / SHOP_PANEL_ASPECT_RATIO);

  return { width, height };
}

export function ShopOverlay({ visible, onClose, screenWidth, screenHeight }: ShopOverlayProps) {
  const progress = useProgress();
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null);
  const { connected, products, fetchProducts, requestPurchase } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void handlePurchaseSuccess(purchase);
    },
    onPurchaseError: () => {
      setBuyingProductId(null);
    },
    onError: () => {
      setBuyingProductId(null);
    },
  });
  const [fontsLoaded] = useFonts({
    NunitoSansVariable: require('../../assets/Fonts/Nunito_Sans/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf'),
  });
  const [pressedCardId, setPressedCardId] = useState<string | null>(null);
  const overlayLayout = buildShopOverlayLayout(screenWidth, screenHeight);
  const closeScale = useRef(new Animated.Value(1)).current;
  const closeButtonSize = scaledDimension(overlayLayout.width * SHOP_CLOSE_BUTTON_SIZE_RATIO);
  const closeButtonTop = roundPixels(overlayLayout.height * SHOP_CLOSE_BUTTON_TOP_RATIO);
  const closeButtonRight = roundPixels(overlayLayout.width * SHOP_CLOSE_BUTTON_RIGHT_RATIO);
  const gridWidth = overlayLayout.width * (1 - SHOP_GRID_SIDE_INSET_RATIO * 2);
  const columnGap = scaledDimension(overlayLayout.width * SHOP_GRID_COLUMN_GAP_RATIO);
  const rowGap = scaledDimension(overlayLayout.height * SHOP_GRID_ROW_GAP_RATIO);
  const cardWidth = Math.floor((gridWidth - columnGap) / 2);
  const cardHeight = scaledDimension(overlayLayout.height * SHOP_CARD_HEIGHT_RATIO);
  const cardRadius = scaledDimension(overlayLayout.width * SHOP_CARD_RADIUS_RATIO);
  const footerBottom = scaledDimension(overlayLayout.height * SHOP_FOOTER_BAR_BOTTOM_RATIO);
  const footerSideInset = scaledDimension(overlayLayout.width * SHOP_FOOTER_BAR_SIDE_INSET_RATIO);
  const footerHeight = scaledDimension(overlayLayout.height * SHOP_FOOTER_BAR_HEIGHT_RATIO);

  useEffect(() => {
    if (!visible || !connected) {
      return;
    }

    void fetchProducts({ skus: COIN_PACK_PRODUCT_IDS, type: 'in-app' });
  }, [connected, fetchProducts, visible]);

  function renderOutlinedText(
    text: string,
    fontSize: number,
    color: string,
    topNudge = 0,
  ) {
    const baseStyle = {
      position: 'absolute' as const,
      color,
      fontSize,
      lineHeight: Math.round(fontSize * 1.02),
      fontFamily: fontsLoaded ? 'NunitoSansVariable' : undefined,
      fontWeight: '800' as const,
      textAlign: 'center' as const,
      top: topNudge,
    };

    return (
      <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center' }}>
        {[
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].map(([x, y], index) => (
          <Text
            key={`${text}-outline-${index}`}
            style={[
              baseStyle,
              {
                color: SHOP_TEXT_OUTLINE,
                transform: [{ translateX: x }, { translateY: y }],
              },
            ]}
          >
            {text}
          </Text>
        ))}
        <Text style={baseStyle}>{text}</Text>
      </View>
    );
  }

  function animateClose(toValue: number) {
    Animated.spring(closeScale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }

  async function handlePurchaseSuccess(purchase: Purchase) {
    if (purchase.purchaseState === 'pending') {
      return;
    }

    const coinPack = getCoinPackProduct(purchase.productId);
    if (!coinPack) {
      return;
    }

    const transactionId = purchase.transactionId ?? purchase.purchaseToken ?? purchase.id;
    const granted = await progress.buyCoinPack(coinPack.productId, coinPack.coins, transactionId);
    if (!granted) {
      setBuyingProductId(null);
      return;
    }

    await finishTransaction({ purchase, isConsumable: true });
    setBuyingProductId(null);
  }

  async function handleBuy(item: ShopItem) {
    if (item.coinPackProductId) {
      setBuyingProductId(item.coinPackProductId);
      try {
        await requestPurchase({
          request: {
            apple: { sku: item.coinPackProductId },
            google: { skus: [item.coinPackProductId] },
          },
          type: 'in-app',
        });
      } catch {
        setBuyingProductId(null);
      }
      return;
    }

    if (!item.boosterId || !item.coinCost || !item.boosterAmount) {
      return;
    }

    await progress.buyBoosterPack(item.boosterId, item.coinCost, item.boosterAmount);
  }

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close shop"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            width: overlayLayout.width,
            height: overlayLayout.height,
            transform: [
              { translateX: roundPixels(screenWidth * SHOP_PANEL_OFFSET_X) },
              { translateY: roundPixels(screenWidth * SHOP_PANEL_OFFSET_Y) },
            ],
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            <Image
              source={shopBackgroundImage}
              fadeDuration={0}
              resizeMode="contain"
              style={{
                width: '100%',
                height: '100%',
              }}
            />

            <View
              style={{
                position: 'absolute',
                top: scaledDimension(overlayLayout.height * SHOP_GRID_TOP_RATIO),
                left: scaledDimension(overlayLayout.width * SHOP_GRID_SIDE_INSET_RATIO),
                width: gridWidth,
                gap: rowGap,
              }}
            >
              {Array.from({ length: Math.ceil(shopItems.length / 2) }, (_, rowIndex) => (
                <View
                  key={`shop-row-${rowIndex}`}
                  style={{
                    flexDirection: 'row',
                    gap: columnGap,
                  }}
                >
                  {shopItems.slice(rowIndex * 2, rowIndex * 2 + 2).map((item) => {
                    const iconSize = scaledDimension(cardWidth * SHOP_CARD_ICON_SIZE_RATIO);
                    const buyButtonWidth = scaledDimension(cardWidth * SHOP_CARD_PRICE_BUTTON_WIDTH_RATIO);
                    const buyButtonHeight = scaledDimension(cardHeight * SHOP_CARD_PRICE_BUTTON_HEIGHT_RATIO);
                    const ribbonWidth = scaledDimension(cardWidth * SHOP_CARD_TITLE_RIBBON_WIDTH_RATIO);
                    const ribbonHeight = scaledDimension(ribbonWidth * (242 / 2048));
                    const coinProduct = item.coinPackProductId
                      ? products.find((product) => product.id === item.coinPackProductId)
                      : null;
                    const displayedPrice = coinProduct?.displayPrice ?? item.price;
                    const isCashPrice = Boolean(item.coinPackProductId);
                    const titleTextTopNudge = roundPixels(cardHeight * SHOP_CARD_TITLE_TEXT_TOP_NUDGE_RATIO);
                    const quantityTextTopNudge = roundPixels(cardHeight * SHOP_CARD_QUANTITY_TEXT_TOP_NUDGE_RATIO);
                    const priceTextTopNudge = roundPixels(cardHeight * SHOP_CARD_PRICE_TEXT_TOP_NUDGE_RATIO);
                    const priceTextTranslateX = roundPixels(
                      cardWidth *
                        (isCashPrice
                          ? SHOP_CARD_CASH_PRICE_TEXT_X_OFFSET_RATIO
                          : SHOP_CARD_PRICE_TEXT_X_OFFSET_RATIO),
                    );
                    const priceTextOffsetY = roundPixels(
                      cardHeight *
                        (isCashPrice
                          ? SHOP_CARD_CASH_PRICE_TEXT_Y_OFFSET_RATIO
                          : SHOP_CARD_PRICE_TEXT_Y_OFFSET_RATIO),
                    );
                    const priceCoinIconTranslateX = roundPixels(
                      cardWidth * SHOP_CARD_PRICE_COIN_ICON_X_OFFSET_RATIO,
                    );
                    const priceCoinIconTranslateY = roundPixels(
                      cardHeight * SHOP_CARD_PRICE_COIN_ICON_Y_OFFSET_RATIO,
                    );
                    const isBoosterPurchase = Boolean(item.boosterId && item.coinCost && item.boosterAmount);
                    const isCoinPackPurchase = Boolean(item.coinPackProductId && item.coinAmount);
                    const canAfford = isBoosterPurchase && progress.wallet.coins >= (item.coinCost ?? 0);
                    const coinPackAvailable = isCoinPackPurchase && connected && Boolean(coinProduct);
                    const buyDisabled =
                      (isBoosterPurchase && !canAfford) ||
                      (isCoinPackPurchase && (!coinPackAvailable || buyingProductId === item.coinPackProductId)) ||
                      (!isBoosterPurchase && !isCoinPackPurchase);
                    const isPressed = pressedCardId === item.id;

                    return (
                      <View
                        key={item.id}
                        style={{
                          width: cardWidth,
                          height: cardHeight,
                          borderRadius: cardRadius,
                          backgroundColor: 'rgba(255, 246, 236, 0.95)',
                          borderWidth: 2,
                          borderColor: 'rgba(244, 201, 164, 0.95)',
                          overflow: 'visible',
                          alignItems: 'center',
                          opacity: buyDisabled ? 0.76 : 1,
                        }}
                      >
                        <Image
                          source={shopTitleRibbonImage}
                          fadeDuration={0}
                          resizeMode="contain"
                          style={{
                            position: 'absolute',
                            top: scaledDimension(cardHeight * SHOP_CARD_TITLE_TOP_RATIO),
                            width: ribbonWidth,
                            height: ribbonHeight,
                          }}
                        />

                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: scaledDimension(cardHeight * SHOP_CARD_TITLE_TOP_RATIO) + ribbonHeight * 0.18,
                            left: cardWidth * 0.08,
                            right: cardWidth * 0.08,
                            alignItems: 'center',
                          }}
                        >
                          {renderOutlinedText(
                            item.title,
                            scaledDimension(cardWidth * SHOP_CARD_TITLE_TEXT_SIZE_RATIO),
                            SHOP_TEXT_COLOR,
                            titleTextTopNudge,
                          )}
                        </View>

                        <Image
                          source={item.icon}
                          fadeDuration={0}
                          resizeMode="contain"
                          style={{
                            position: 'absolute',
                            top: scaledDimension(cardHeight * SHOP_CARD_ICON_TOP_RATIO),
                            width: iconSize,
                            height: iconSize,
                          }}
                        />

                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: scaledDimension(cardHeight * SHOP_CARD_QUANTITY_TOP_RATIO),
                            left: 0,
                            right: 0,
                            alignItems: 'center',
                          }}
                        >
                          {renderOutlinedText(
                            item.quantity,
                            scaledDimension(cardWidth * SHOP_CARD_QUANTITY_TEXT_SIZE_RATIO),
                            '#ffffff',
                            quantityTextTopNudge,
                          )}
                        </View>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Buy ${item.title}`}
                          disabled={buyDisabled}
                          onPress={() => {
                            void handleBuy(item);
                          }}
                          onPressIn={() => setPressedCardId(item.id)}
                          onPressOut={() => setPressedCardId((current) => (current === item.id ? null : current))}
                          style={{
                            position: 'absolute',
                            bottom: scaledDimension(cardHeight * SHOP_CARD_PRICE_BUTTON_BOTTOM_RATIO),
                            width: buyButtonWidth,
                            height: buyButtonHeight,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: buyDisabled ? 0.55 : 1,
                            transform: [{ scale: isPressed && !buyDisabled ? 0.94 : 1 }],
                          }}
                        >
                          <Image
                            source={shopBuyButtonImage}
                            fadeDuration={0}
                            resizeMode="contain"
                            style={{
                              width: buyButtonWidth,
                              height: buyButtonHeight,
                            }}
                          />
                        </Pressable>

                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            bottom:
                              scaledDimension(cardHeight * SHOP_CARD_PRICE_BUTTON_BOTTOM_RATIO) +
                              (buyButtonHeight - scaledDimension(cardWidth * SHOP_CARD_PRICE_TEXT_SIZE_RATIO)) / 2 +
                              priceTextOffsetY,
                            left: cardWidth * 0.14,
                            right: cardWidth * 0.14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: scaledDimension(cardWidth * 0.025),
                            transform: [{ translateX: priceTextTranslateX }],
                          }}
                        >
                          {isCashPrice ? null : (
                            <Image
                              source={treeMapRuntimeAssets.resourceCoinIcon}
                              fadeDuration={0}
                              resizeMode="contain"
                              style={{
                                width: scaledDimension(cardWidth * SHOP_CARD_PRICE_COIN_ICON_SIZE_RATIO),
                                height: scaledDimension(cardWidth * SHOP_CARD_PRICE_COIN_ICON_SIZE_RATIO),
                                transform: [
                                  { translateX: priceCoinIconTranslateX },
                                  { translateY: priceCoinIconTranslateY },
                                ],
                              }}
                            />
                          )}
                          {renderOutlinedText(
                            displayedPrice,
                            scaledDimension(cardWidth * SHOP_CARD_PRICE_TEXT_SIZE_RATIO),
                            SHOP_PRICE_TEXT_COLOR,
                            priceTextTopNudge,
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {shopItems.slice(rowIndex * 2, rowIndex * 2 + 2).length === 1 ? (
                    <View style={{ width: cardWidth, height: cardHeight }} />
                  ) : null}
                </View>
              ))}
            </View>

            <View
              style={{
                position: 'absolute',
                left: footerSideInset,
                right: footerSideInset,
                bottom: footerBottom,
                height: footerHeight,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: scaledDimension(overlayLayout.width * 0.018),
              }}
            >
              <Image
                source={treeMapRuntimeAssets.resourceCoinIcon}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  width: scaledDimension(overlayLayout.width * SHOP_FOOTER_COIN_ICON_SIZE_RATIO),
                  height: scaledDimension(overlayLayout.width * SHOP_FOOTER_COIN_ICON_SIZE_RATIO),
                  transform: [
                    { translateX: roundPixels(overlayLayout.width * SHOP_FOOTER_COIN_ICON_X_OFFSET_RATIO) },
                    { translateY: roundPixels(overlayLayout.height * SHOP_FOOTER_COIN_ICON_Y_OFFSET_RATIO) },
                  ],
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  minWidth: scaledDimension(overlayLayout.width * 0.16),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderOutlinedText(
                  progress.wallet.coins.toLocaleString(),
                  scaledDimension(overlayLayout.width * SHOP_FOOTER_TEXT_SIZE_RATIO),
                  SHOP_PRICE_TEXT_COLOR,
                )}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close shop"
              onPress={onClose}
              onPressIn={() => animateClose(0.92)}
              onPressOut={() => animateClose(1)}
              style={{
                position: 'absolute',
                top: closeButtonTop,
                right: closeButtonRight,
                width: closeButtonSize,
                height: closeButtonSize,
                zIndex: 2,
              }}
            >
              <Animated.Image
                source={shopCloseImage}
                fadeDuration={0}
                resizeMode="contain"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [{ scale: closeScale }],
                }}
              />
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
