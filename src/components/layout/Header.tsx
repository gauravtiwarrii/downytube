import { Youtube, Scissors } from 'lucide-react';
import Link from 'next/link';
import AuthConnect from '@/components/features/AuthConnect';

const Header = () => {
  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Youtube className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                DownyTube
              </h1>
            </Link>
            <nav>
              <Link href="/clipping" className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                <Scissors className="h-5 w-5" />
                <span>Clip</span>
              </Link>
            </nav>
          </div>
          <AuthConnect />
        </div>
      </div>
    </header>
  );
};

export default Header;
