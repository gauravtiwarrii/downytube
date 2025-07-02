import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'youtube_auth_token';

export async function GET() {
  try {
    cookies().delete(COOKIE_NAME);
  } catch (error) {
    console.error("Failed to delete auth cookie:", error);
    // Even if cookie deletion fails, we can still try to redirect
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  // Redirect to the home page. The page will reload and auth status will be updated.
  return NextResponse.redirect(baseUrl);
}
