export type CoinPackProduct = {
  productId: string;
  title: string;
  quantityLabel: string;
  fallbackPrice: string;
  coins: number;
};

export const COIN_PACK_PRODUCTS = [
  {
    productId: 'coins_10000',
    title: 'Coins Pack',
    quantityLabel: '10 000',
    fallbackPrice: '$1.99',
    coins: 10000,
  },
] as const satisfies readonly CoinPackProduct[];

export const COIN_PACK_PRODUCT_IDS = COIN_PACK_PRODUCTS.map((product) => product.productId);

export function getCoinPackProduct(productId: string) {
  return COIN_PACK_PRODUCTS.find((product) => product.productId === productId) ?? null;
}
