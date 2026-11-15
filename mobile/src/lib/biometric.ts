import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Fingerprint (or face) lock: once signed in with the password, Anwarz can be opened with the
// fingerprint instead. The phone's own PIN/pattern works as a fallback. The choice is kept in the
// phone's secure storage; the sign-in token itself never leaves it.

const KEY = 'anwarz_biometric_lock';
const ASKED = 'anwarz_biometric_asked';

/** True when the phone has a fingerprint (or face) reader with one enrolled. */
export async function biometricAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function biometricEnabled() {
  if (Platform.OS === 'web') return false;
  return (await SecureStore.getItemAsync(KEY).catch(() => null)) === '1';
}

export async function setBiometricEnabled(on: boolean) {
  if (Platform.OS === 'web') return;
  if (on) await SecureStore.setItemAsync(KEY, '1');
  else await SecureStore.deleteItemAsync(KEY);
}

/** Whether we already offered the fingerprint after a sign-in (offered once). */
export async function biometricOffered() {
  return (await SecureStore.getItemAsync(ASKED).catch(() => null)) === '1';
}

export async function markBiometricOffered() {
  await SecureStore.setItemAsync(ASKED, '1').catch(() => undefined);
}

/** Shows the phone's fingerprint prompt. True when it was the owner. */
export async function unlockWithBiometric(reason = 'Unlock Anwarz') {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancel', disableDeviceFallback: false });
    return r.success;
  } catch {
    return false;
  }
}
