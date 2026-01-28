'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { LoadingOverlay } from '@/components/loading-overlay';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Prüfe ob User eingeloggt ist
    if (authApi.isAuthenticated()) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return <LoadingOverlay variant="light" message="Wird geladen..." />;
}
