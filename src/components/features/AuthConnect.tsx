'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { checkAuthStatus } from '@/app/actions';
import { LogIn, LogOut } from 'lucide-react';

export default function AuthConnect() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus().then((status) => {
      setIsAuthenticated(status);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <Button variant="outline" size="sm" disabled>Loading...</Button>;
  }

  if (isAuthenticated) {
    return (
      <a href="/api/auth/google/logout">
        <Button variant="outline" size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </a>
    );
  }

  return (
    <a href="/api/auth/google/login">
      <Button variant="outline" size="sm">
        <LogIn className="mr-2 h-4 w-4" />
        Connect YouTube
      </Button>
    </a>
  );
}
