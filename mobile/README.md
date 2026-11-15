# Anwarz (mobile app)

Android app for the North Via Marketing control center. Expo (SDK 58) + Expo Router, talking to the
website's `/api/app/*` routes. Plan, phases and API list: [../ANWARZ_APP_PLAN.md](../ANWARZ_APP_PLAN.md).

- Live testing on the phone: `npx expo start`, then scan the QR code in Expo Go (same Wi-Fi).
- APK: `npx eas-cli@latest build -p android --profile preview` (only when native things change: new modules,
  sounds, permissions, app.json plugins).
- Over-the-air update to installed APKs (screens, text, logic): `npm run update -- "what changed"`.
  The runtime version follows the native fingerprint, so an update never reaches an APK it doesn't fit.
- Checks: `npx tsc --noEmit` and `npx expo lint`
