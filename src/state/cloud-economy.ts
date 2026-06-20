import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import {
  createDefaultBoosterInventory,
  ENERGY_REFILL_INTERVAL_MS,
  FIRST_CLEAR_COIN_REWARD_BASE,
  FIRST_CLEAR_COIN_REWARD_PER_LEVEL,
  MAX_ENERGY,
  STAR_COIN_REWARD_BY_TIER,
  STAR_COIN_REWARD_PER_LEVEL_BY_TIER,
  type BoosterId,
  type BoosterInventoryState,
  type ProgressState,
} from '@/state/progress-helpers';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = 'fruity-splash-supabase-auth';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

export type CloudEconomyState = {
  coins: number;
  boosters: BoosterInventoryState;
  energy: ProgressState['lives'];
};

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

function loadGoogleSignin(): GoogleSigninModule | null {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

function normalizeBoosterInventory(value: unknown): BoosterInventoryState {
  const defaults = createDefaultBoosterInventory();
  const source =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    bomb: typeof source.bomb === 'number' && Number.isFinite(source.bomb) ? Math.max(0, Math.floor(source.bomb)) : defaults.bomb,
    lineRocket:
      typeof source.lineRocket === 'number' && Number.isFinite(source.lineRocket)
        ? Math.max(0, Math.floor(source.lineRocket))
        : defaults.lineRocket,
    fruityCross:
      typeof source.fruityCross === 'number' && Number.isFinite(source.fruityCross)
        ? Math.max(0, Math.floor(source.fruityCross))
        : defaults.fruityCross,
    lightningFruits:
      typeof source.lightningFruits === 'number' && Number.isFinite(source.lightningFruits)
        ? Math.max(0, Math.floor(source.lightningFruits))
        : defaults.lightningFruits,
    hammer:
      typeof source.hammer === 'number' && Number.isFinite(source.hammer)
        ? Math.max(0, Math.floor(source.hammer))
        : defaults.hammer,
  };
}

function normalizeCloudEconomy(row: unknown): CloudEconomyState | null {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return null;
  }

  const source = row as Record<string, unknown>;
  const energyMax =
    typeof source.energy_max === 'number' && Number.isFinite(source.energy_max)
      ? Math.max(1, Math.min(MAX_ENERGY, Math.floor(source.energy_max)))
      : MAX_ENERGY;
  const parsedEnergyRefillAt =
    typeof source.energy_last_refill_at === 'string' ? Date.parse(source.energy_last_refill_at) : Number.NaN;

  return {
    coins: typeof source.coins === 'number' && Number.isFinite(source.coins) ? Math.max(0, Math.floor(source.coins)) : 0,
    boosters: normalizeBoosterInventory(source.boosters),
    energy: {
      current:
        typeof source.energy_current === 'number' && Number.isFinite(source.energy_current)
          ? Math.max(0, Math.min(energyMax, Math.floor(source.energy_current)))
          : MAX_ENERGY,
      max: energyMax,
      lastRefillAt: Number.isFinite(parsedEnergyRefillAt) ? parsedEnergyRefillAt : Date.now(),
    },
  };
}

export function applyCloudEconomyToProgress(progress: ProgressState, economy: CloudEconomyState): ProgressState {
  return {
    ...progress,
    wallet: {
      ...progress.wallet,
      coins: economy.coins,
    },
    inventory: {
      ...progress.inventory,
      boosters: economy.boosters,
    },
    lives: economy.energy,
  };
}

export const cloudEconomyConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let supabaseClient: SupabaseClient | null = null;
let appStateBound = false;

function getSupabaseClient() {
  if (!cloudEconomyConfigured) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: {
        storageKey: STORAGE_KEY,
        storage: secureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  }

  if (!appStateBound && supabaseClient && Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabaseClient?.auth.startAutoRefresh();
      } else {
        supabaseClient?.auth.stopAutoRefresh();
      }
    });
    appStateBound = true;
  }

  return supabaseClient;
}

export async function ensureCloudEconomySession() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return true;
  }

  const googleSignin = loadGoogleSignin();
  if (!googleSignin) {
    return false;
  }

  try {
    const tokens = await googleSignin.GoogleSignin.getTokens();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: tokens.idToken,
      access_token: tokens.accessToken,
    });

    return !error;
  } catch {
    return false;
  }
}

export async function signOutCloudEconomy() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

async function fetchOrCreateEconomy() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const sessionReady = await ensureCloudEconomySession();
  if (!sessionReady) {
    return null;
  }

  const { data: existingRow, error: selectError } = await supabase
    .from('player_economy')
    .select('coins, boosters, energy_current, energy_max, energy_last_refill_at')
    .maybeSingle();

  if (selectError) {
    return null;
  }

  if (existingRow) {
    return normalizeCloudEconomy(existingRow);
  }

  const defaults = createDefaultBoosterInventory();
  const { data: createdRow, error: insertError } = await supabase
    .from('player_economy')
    .insert({
      coins: 0,
      boosters: defaults,
      energy_current: MAX_ENERGY,
      energy_max: MAX_ENERGY,
      energy_last_refill_at: new Date().toISOString(),
    })
    .select('coins, boosters, energy_current, energy_max, energy_last_refill_at')
    .single();

  if (insertError) {
    return null;
  }

  return normalizeCloudEconomy(createdRow);
}

async function callEconomyRpc(functionName: string, args: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const sessionReady = await ensureCloudEconomySession();
  if (!sessionReady) {
    return null;
  }

  const { data, error } = await supabase.rpc(functionName, args);
  if (error) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeCloudEconomy(row);
}

export async function loadCloudEconomy() {
  return fetchOrCreateEconomy();
}

export async function buyBoosterPackCloud(boosterId: BoosterId, coinCost: number, boosterAmount: number) {
  return callEconomyRpc('buy_booster_pack', {
    booster_key: boosterId,
    coin_cost: coinCost,
    booster_amount: boosterAmount,
  });
}

export async function grantPurchasedCoinPackCloud(productId: string, transactionId: string, coinAmount: number) {
  return callEconomyRpc('grant_purchased_coin_pack', {
    product_id: productId,
    transaction_id: transactionId,
    coin_amount: coinAmount,
  });
}

export async function consumeBoosterCloud(boosterId: BoosterId) {
  return callEconomyRpc('consume_booster_item', {
    booster_key: boosterId,
  });
}

export async function spendLevelEnergyCloud() {
  return callEconomyRpc('spend_level_energy', {
    refill_interval_ms: ENERGY_REFILL_INTERVAL_MS,
  });
}

export async function claimLevelCompletionCloud(levelId: number, score: number, stars: number) {
  return callEconomyRpc('claim_level_completion', {
    completed_level_id: levelId,
    earned_score: score,
    earned_stars: stars,
    first_clear_reward_base: FIRST_CLEAR_COIN_REWARD_BASE,
    first_clear_reward_per_level: FIRST_CLEAR_COIN_REWARD_PER_LEVEL,
    star1_reward_base: STAR_COIN_REWARD_BY_TIER[0],
    star1_reward_per_level: STAR_COIN_REWARD_PER_LEVEL_BY_TIER[0],
    star2_reward_base: STAR_COIN_REWARD_BY_TIER[1],
    star2_reward_per_level: STAR_COIN_REWARD_PER_LEVEL_BY_TIER[1],
    star3_reward_base: STAR_COIN_REWARD_BY_TIER[2],
    star3_reward_per_level: STAR_COIN_REWARD_PER_LEVEL_BY_TIER[2],
  });
}
