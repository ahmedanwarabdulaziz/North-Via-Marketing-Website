# Anwarz (mobile app)

Android app for the North Via Marketing control center. Expo (SDK 58) + Expo Router, talking to the
website's `/api/app/*` routes. Plan, phases and API list: [../ANWARZ_APP_PLAN.md](../ANWARZ_APP_PLAN.md).

- Live testing on the phone: `npx expo start`, then scan the QR code in Expo Go (same Wi-Fi).
- APK: `npx eas-cli@latest build -p android --profile preview`
- Checks: `npx tsc --noEmit` and `npx expo lint`
