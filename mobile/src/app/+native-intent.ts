// Something shared to Anwarz from another app (Android share menu) arrives as an expo-sharing
// link; it opens the Share screen. Every other link opens as usual.
export async function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (new URL(path).hostname === 'expo-sharing') return '/share';
    return path;
  } catch {
    return path || '/';
  }
}
