import { getGoogleOAuthClient, setTokensAsCookie } from '@/lib/youtube-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';


  if (error) {
    console.error('OAuth Error:', error);
    return NextResponse.redirect(`${baseUrl}?error=oauth_failed`);
  }

  if (!code) {
    console.error('No code received in OAuth callback');
    return NextResponse.redirect(`${baseUrl}?error=oauth_no_code`);
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await setTokensAsCookie(tokens);

    return NextResponse.redirect(baseUrl);
  } catch (err) {
    console.error('Failed to exchange code for tokens', err);
    return NextResponse.redirect(`${baseUrl}?error=token_exchange_failed`);
  }
}
