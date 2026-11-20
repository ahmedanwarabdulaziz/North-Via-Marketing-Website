import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Native sign-in: the Facebook app on the phone (Facebook SDK) and the phone's Google account picker
// (Google Sign-In). Both kits are native code, so they exist only in builds made after they were
// added (0.7.0+); in Expo Go or an older APK these return null and the caller uses the browser
// sign-in instead. Values come from app.json → extra.nativeSignIn.

interface NativeSignInConfig {
  facebookPermissions?: string[];
  googleWebClientId?: string;
}

const config = (Constants.expoConfig?.extra?.nativeSignIn ?? {}) as NativeSignInConfig;

// Same permissions as the website's Facebook login (lib/meta.ts META_SCOPES).
const FACEBOOK_PERMISSIONS = config.facebookPermissions ?? [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_engagement',
  'read_insights',
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'business_management',
  'ads_read',
];

export const GOOGLE_SCOPES = {
  google_ads: ['https://www.googleapis.com/auth/adwords'],
  gbp: ['https://www.googleapis.com/auth/business.manage'],
} as const;

/** Thrown when the person closes the sign-in: not an error to show. */
export class SignInCancelled extends Error {}

function loadFacebook(): typeof import('react-native-fbsdk-next') | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-fbsdk-next') as typeof import('react-native-fbsdk-next');
    // The JS loads in Expo Go too; the native part is what's missing there.
    return mod?.LoginManager && mod.AccessToken ? mod : null;
  } catch {
    return null;
  }
}

function loadGoogle(): typeof import('@react-native-google-signin/google-signin') | null {
  if (Platform.OS === 'web' || !config.googleWebClientId) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

/**
 * Facebook login through the Facebook app (or Facebook's own login screen when the app isn't
 * installed). Returns the user access token, or null when native login isn't available here.
 */
export async function facebookNativeLogin(): Promise<string | null> {
  const fb = loadFacebook();
  if (!fb) return null;
  let result;
  try {
    fb.LoginManager.logOut(); // a fresh login, so he can pick the Pages and ad accounts again
    result = await fb.LoginManager.logInWithPermissions(FACEBOOK_PERMISSIONS);
  } catch (error) {
    // The native module isn't in this build: fall back to the browser.
    if (/null|undefined|not found|native module/i.test(String(error))) return null;
    throw error;
  }
  if (result.isCancelled) throw new SignInCancelled();
  const token = await fb.AccessToken.getCurrentAccessToken();
  if (!token?.accessToken) throw new Error('Facebook didn’t return a login. Try again.');
  return token.accessToken.toString();
}

/**
 * Google sign-in with the phone's account picker, asking for `scopes` with offline access.
 * Returns a one-time server code for the website to exchange, or null when not available here.
 */
export async function googleNativeCode(scopes: readonly string[]): Promise<string | null> {
  const g = loadGoogle();
  if (!g) return null;
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = g;
  try {
    GoogleSignin.configure({ webClientId: config.googleWebClientId, offlineAccess: true, forceCodeForRefreshToken: true, scopes: [...scopes] });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut().catch(() => undefined); // let him choose the account each time
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new SignInCancelled();
    const code = response.data.serverAuthCode;
    if (!code) throw new Error('Google didn’t return a server code. Check the web client ID in the app settings.');
    return code;
  } catch (error) {
    if (error instanceof SignInCancelled) throw error;
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) throw new SignInCancelled();
    if (/RNGoogleSignin|native module|TurboModuleRegistry/i.test(String(error))) return null;
    throw error;
  }
}
