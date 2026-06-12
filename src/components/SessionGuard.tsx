'use client';

import { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

interface SessionGuardProps {
  children: React.ReactNode;
}

/**
 * Guards protected content by checking session validity.
 * When session expires or is missing, redirects to the sign-in page.
 * Handles the session expiry requirement by redirecting unauthenticated users.
 */
export function SessionGuard({ children }: SessionGuardProps) {
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn(undefined, { callbackUrl: window.location.href });
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" aria-hidden="true" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
