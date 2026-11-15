import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { api, onUnauthorized, setSession, tokenStore } from './api';
import { biometricEnabled, unlockWithBiometric } from './biometric';

// Signed in = the phone holds a token from the password sign-in. With the fingerprint lock on, the app
// opens locked (and locks again after 2 minutes in the background) until the fingerprint unlocks it.

const RELOCK_AFTER_MS = 2 * 60_000;

interface Auth {
  ready: boolean;
  signedIn: boolean;
  locked: boolean;
  signIn(password: string): Promise<void>;
  signOut(): Promise<void>;
  unlock(): Promise<boolean>;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  const forget = useCallback(async () => {
    setSession(null);
    setSignedIn(false);
    setLocked(false);
    await tokenStore.clear().catch(() => undefined);
  }, []);

  useEffect(() => {
    onUnauthorized(() => void forget());
    Promise.all([tokenStore.get(), biometricEnabled()])
      .then(([saved, lock]) => {
        if (saved) {
          setSession(saved);
          setSignedIn(true);
          setLocked(lock);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [forget]);

  // Back from the background after a while: lock again (only when the fingerprint lock is on).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) {
        backgroundAt.current = null;
        void biometricEnabled().then((on) => {
          if (on) setLocked(true);
        });
      }
    });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (password: string) => {
    const result = await api<{ token: string }>('/login', {
      body: {
        password,
        deviceName: Device.deviceName || Device.modelName || 'Phone',
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? null,
      },
    });
    setSession(result.token);
    await tokenStore.set(result.token);
    setLocked(false);
    setSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await api('/logout', { method: 'POST' }).catch(() => undefined);
    await forget();
  }, [forget]);

  const unlock = useCallback(async () => {
    const ok = await unlockWithBiometric();
    if (ok) setLocked(false);
    return ok;
  }, []);

  const value = useMemo(() => ({ ready, signedIn, locked, signIn, signOut, unlock }), [ready, signedIn, locked, signIn, signOut, unlock]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
