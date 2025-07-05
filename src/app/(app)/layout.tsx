import { checkAuthStatus } from '@/lib/youtube-auth';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await checkAuthStatus();
  if (!isAuthenticated) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
