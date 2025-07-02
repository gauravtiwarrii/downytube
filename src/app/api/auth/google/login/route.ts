import { getAuthUrl } from '@/lib/youtube-auth';
import { redirect } from 'next/navigation';

export async function GET() {
  const url = getAuthUrl();
  redirect(url);
}
