'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { checkAuthStatus } from '@/app/actions';
import { LogIn, CheckCircle } from 'lucide-react';

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
      <Button variant="outline" size="sm" disabled>
        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
        Connected
      </Button>
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
