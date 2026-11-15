import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { api, onUnauthorized, setSession, tokenStore } from './api';

interface Auth {
  ready: boolean;
  signedIn: boolean;
  signIn(password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const forget = useCallback(async () => {
    setSession(null);
    setSignedIn(false);
    await tokenStore.clear().catch(() => undefined);
  }, []);

  useEffect(() => {
    onUnauthorized(() => void forget());
    tokenStore
      .get()
      .then((saved) => {
        if (saved) {
          setSession(saved);
          setSignedIn(true);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [forget]);

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
    setSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await api('/logout', { method: 'POST' }).catch(() => undefined);
    await forget();
  }, [forget]);

  const value = useMemo(() => ({ ready, signedIn, signIn, signOut }), [ready, signedIn, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
