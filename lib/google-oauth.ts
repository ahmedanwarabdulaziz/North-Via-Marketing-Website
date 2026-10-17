/**
 * Google OAuth redirect address for the site the request came in on:
 * https://www.northviamarketing.com/... in production, localhost when developing.
 * The address must also be listed under "Authorized redirect URIs" on the OAuth
 * client in Google Cloud. GOOGLE_REDIRECT_URI is only a fallback.
 */
export function googleRedirectUri(requestUrl?: string) {
  if (requestUrl) {
    const url = new URL(requestUrl);
    if (url.protocol === 'https:' || url.hostname === 'localhost') return `${url.origin}/api/google/callback`;
  }
  return process.env.GOOGLE_REDIRECT_URI || 'https://www.northviamarketing.com/api/google/callback';
}
