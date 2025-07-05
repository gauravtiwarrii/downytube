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
  
  const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/login`;
  // Redirect to the login page.
  return NextResponse.redirect(loginUrl);
}
