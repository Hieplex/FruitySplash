# Google Sign-In Setup

Fruity Splash uses `@react-native-google-signin/google-signin` for Google account sign-in on Android.

## Required Google setup

1. Upload the app to Google Play at least once on an internal test track.
2. In Google Play Console, open `Release > Setup > App integrity`.
3. Copy the SHA-1 values for:
   - Upload key certificate
   - App signing key certificate
4. In Google Cloud Console or Firebase, create OAuth clients for package:
   - `com.hieplex.fruitysplash`
5. Add the SHA-1 fingerprints above to the Android OAuth client.
6. Create or copy the Web client ID.
7. Build with this environment variable:

```powershell
$env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
npx eas-cli@latest build -p android --profile production
```

## Testing

Google Sign-In uses native code. It will not work in Expo Go. Test with a native build:

```powershell
npx eas-cli@latest build -p android --profile development
npx expo start --dev-client
```

## Current scope

This signs the player into a Google account. It does not yet cloud-save game progress. Cloud save needs a backend or Google Play Games Saved Games integration.
