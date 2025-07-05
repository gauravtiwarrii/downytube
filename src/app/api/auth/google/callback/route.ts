import { getGoogleOAuthClient, setTokensAsCookie } from '@/lib/youtube-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/login`;


  if (error) {
    console.error('OAuth Error:', error);
    return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
  }

  if (!code) {
    console.error('No code received in OAuth callback');
    return NextResponse.redirect(`${loginUrl}?error=oauth_no_code`);
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await setTokensAsCookie(tokens);

    // Redirect to the main app page upon successful login
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    return NextResponse.redirect(appUrl);
  } catch (err) {
    console.error('Failed to exchange code for tokens', err);
    return NextResponse.redirect(`${loginUrl}?error=token_exchange_failed`);
  }
}
