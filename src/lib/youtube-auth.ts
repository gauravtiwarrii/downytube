import 'dotenv/config';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Credentials } from 'google-auth-library';

const OAUTH_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtubepartner'];
const COOKIE_NAME = 'youtube_auth_token';

// Ensure these are set in your .env file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !YOUTUBE_REDIRECT_URI || !AUTH_SECRET) {
  throw new Error('Missing Google OAuth credentials or AUTH_SECRET in environment variables.');
}

const secretKey = new TextEncoder().encode(AUTH_SECRET);

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getGoogleOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: OAUTH_SCOPES,
  });
  return url;
}

export async function setTokensAsCookie(tokens: Credentials) {
  const payload = { tokens };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') 
    .sign(secretKey);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function getTokensFromCookie(): Promise<Credentials | null> {
  const tokenCookie = cookies().get(COOKIE_NAME);
  if (!tokenCookie) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(tokenCookie.value, secretKey);
    return payload.tokens as Credentials;
  } catch (error) {
    console.error('Failed to verify auth token cookie:', error);
    return null;
  }
}

export async function getYouTubeClient() {
  let tokens = await getTokensFromCookie();
  if (!tokens) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials(tokens);

  const isTokenExpired = !tokens.expiry_date || tokens.expiry_date < Date.now();
  if (isTokenExpired && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await setTokensAsCookie(credentials);
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      cookies().delete(COOKIE_NAME);
      throw new Error('Could not refresh access token. Please reconnect your YouTube account.');
    }
  }

  return google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });
}
