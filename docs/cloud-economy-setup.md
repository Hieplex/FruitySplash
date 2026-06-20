# Cloud Economy Setup

Fruity Splash can now use a server-authoritative economy for:

- level first-clear coin rewards
- booster shop purchases
- booster consumption

## 1. Install the database schema

Apply this migration to your Supabase project:

- [supabase/migrations/20260617_secure_player_economy.sql](/C:/Apps/FruitySplash/supabase/migrations/20260617_secure_player_economy.sql)

It creates:

- `public.player_economy`
- `public.ensure_player_economy()`
- `public.buy_booster_pack(...)`
- `public.consume_booster_item(...)`
- `public.claim_level_completion(...)`

## 2. Add environment variables

Set these before running or building:

```powershell
$env:EXPO_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY"
$env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
```

## 3. Build a native Android app

Google Sign-In and Supabase token exchange need a native build:

```powershell
npx eas-cli@latest build -p android --profile development
npx expo start --dev-client
```

## 4. What happens without Supabase config

If Supabase env vars are missing, the app falls back to local `AsyncStorage` economy behavior.

That fallback is useful for development, but it is not secure against save editing.

## 5. Important limit

This closes the easy local-storage cheat path for coins and shop buying once Supabase is configured.

It does not make gameplay fully tamper-proof against a determined attacker who can automate or script level completion requests. Full anti-cheat would require the game result itself to be validated server-side, not only the economy writes.
