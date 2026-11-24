import { requireOptionalNativeModule } from 'expo-modules-core';

// The native side of "Improve with Anwarz" (android/…): the Correct / Rephrase panel opened from
// Android's text-selection menu, the floating writing bubble and the quick-settings tile.
// Missing in Expo Go, on the web and in APKs built before a feature was added: every call checks.
type Native = {
  finish(text: string | null): boolean;
  canDrawOverlays?(): boolean;
  openOverlaySettings?(): void;
  startBubble?(): boolean;
  stopBubble?(): boolean;
  isBubbleOn?(): boolean;
  openComposer?(): boolean;
};
const native = requireOptionalNativeModule<Native>('AnwarzText');

/** Closes the panel; with text, Android puts it in place of the selected text. */
export function finishProcessText(text: string | null) {
  return native ? native.finish(text) : false;
}

/** Whether this installed app has the floating bubble (APK 0.9.0 and later on Android). */
export const bubbleSupported = Boolean(native?.startBubble);

export const bubble = {
  canDrawOverlays: () => native?.canDrawOverlays?.() ?? false,
  openOverlaySettings: () => native?.openOverlaySettings?.(),
  start: () => native?.startBubble?.() ?? false,
  stop: () => native?.stopBubble?.() ?? false,
  isOn: () => native?.isBubbleOn?.() ?? false,
  /** The writing panel with an empty text box, as if the bubble were tapped. */
  openComposer: () => native?.openComposer?.() ?? false,
};
