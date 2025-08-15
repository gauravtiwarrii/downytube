import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Credentials } from 'google-auth-library';
import { redirect } from 'next/navigation';

const OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload', 
    'https://www.googleapis.com/auth/youtubepartner',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
];
const COOKIE_NAME = 'youtube_auth_token';

// Ensure these are set in your .env file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const AUTH_SECRET = process.env.AUTH_SECRET;

// Determine the base URL dynamically
const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    // VERCEL_URL is provided by Vercel, but this logic also works for Netlify's DEPLOY_PRIME_URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.DEPLOY_PRIME_URL) {
        return process.env.DEPLOY_PRIME_URL;
    }
    return 'http://localhost:9002';
};

const NEXT_PUBLIC_BASE_URL = getBaseUrl();


if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !AUTH_SECRET) {
  throw new Error('Missing Google OAuth credentials or AUTH_SECRET in environment variables.');
}

const secretKey = new TextEncoder().encode(AUTH_SECRET);

export function getGoogleOAuthClient() {
  const redirectUri = `${NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
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

export async function checkAuthStatus() {
  const tokens = await getTokensFromCookie();
  return !!tokens;
}


export async function getYouTubeClient(options: { forceRedirect?: boolean } = {}) {
  let tokens = await getTokensFromCookie();
  if (!tokens) {
    if (options.forceRedirect) {
        redirect('/login');
    }
    throw new Error('NOT_AUTHENTICATED');
  }

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials(tokens);

  // Check if the token is expired or about to expire in the next minute
  const isTokenExpired = !tokens.expiry_date || tokens.expiry_date < (Date.now() + 60000);
  if (isTokenExpired && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      // Important: combine new credentials with the existing refresh token
      await setTokensAsCookie({ ...tokens, ...credentials });
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      cookies().delete(COOKIE_NAME);
       if (options.forceRedirect) {
        redirect('/login');
      }
      throw new Error('Could not refresh access token. Please reconnect your YouTube account.');
    }
  }

  return google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });
}


export async function getGoogleUserInfo() {
    const tokens = await getTokensFromCookie();
    if (!tokens) return null;

    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials(tokens);

    try {
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2',
        });
        const { data } = await oauth2.userinfo.get();
        return data;
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
}
