import { requireOptionalNativeModule } from 'expo-modules-core';

// The native side of "Improve with Anwarz" (android/…/ProcessTextActivity.kt). Missing in Expo Go.
const native = requireOptionalNativeModule<{ finish(text: string | null): boolean }>('AnwarzText');

/** Closes the panel; with text, Android puts it in place of the selected text. */
export function finishProcessText(text: string | null) {
  return native ? native.finish(text) : false;
}
