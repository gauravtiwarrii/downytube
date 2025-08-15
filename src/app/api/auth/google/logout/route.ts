import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'youtube_auth_token';

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.DEPLOY_PRIME_URL) {
        return process.env.DEPLOY_PRIME_URL;
    }
    return 'http://localhost:9002';
};

export async function GET() {
  try {
    cookies().delete(COOKIE_NAME);
  } catch (error) {
    console.error("Failed to delete auth cookie:", error);
    // Even if cookie deletion fails, we can still try to redirect
  }
  
  const loginUrl = `${getBaseUrl()}/login`;
  // Redirect to the login page.
  return NextResponse.redirect(loginUrl);
}
