import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase';
import { encryptString } from '@/lib/encryption';
import { GoogleConnection } from '@/types/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/admin/settings?error=NoAuthCode', request.url));
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange the code for access & refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.warn('Google did not return a refresh token! Revoke access natively in your Google account and try again.');
    }

    // Process our AES-256-GCM Cryptography to protect external access
    const encryptedAccess = tokens.access_token ? encryptString(tokens.access_token) : '';
    const encryptedRefresh = tokens.refresh_token ? encryptString(tokens.refresh_token) : '';

    const payload: GoogleConnection = {
      provider: 'google',
      accountEmail: 'admin-authorized', 
      encryptedAccessToken: encryptedAccess,
      // If we didn't receive a refresh token but already have one in DB, we should retain the old one ideally,
      // but 'prompt: consent' fundamentally forces a new one every time anyway.
      encryptedRefreshToken: encryptedRefresh,
      tokenExpiry: tokens.expiry_date || Date.now() + 3600 * 1000,
      scopes: tokens.scope ? tokens.scope.split(' ') : ['https://www.googleapis.com/auth/adwords'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Safely write to Firestore using Admin SDK
    await db.collection('google_connections').doc('master_admin_connection').set(payload, { merge: true });

    return NextResponse.redirect(new URL('/admin/settings?success=connected', request.url));
  } catch (error) {
    console.error('Google Callback Critical Server Error:', error);
    return NextResponse.redirect(new URL('/admin/settings?error=CallbackFailed', request.url));
  }
}
