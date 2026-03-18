'use client';

import { ReactNode, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/providers/query-provider';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAdminAuth } from '@/lib/hooks/use-admin-auth';

function AuthLoader({ children }: { children: ReactNode }) {
  const loadUser = useAuth((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return <>{children}</>;
}

function AdminAuthLoader({ children }: { children: ReactNode }) {
  const loadAdmin = useAdminAuth((s) => s.loadAdmin);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryProvider>
        <AuthLoader>
          <AdminAuthLoader>
            {children}
          </AdminAuthLoader>
        </AuthLoader>
      </QueryProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
