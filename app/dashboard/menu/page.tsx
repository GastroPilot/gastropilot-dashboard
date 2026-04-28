'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { restaurantsApi, type Restaurant } from '@/lib/api/restaurants';
import { MenuList } from '@/components/menu/menu-list';
import { LoadingOverlay } from '@/components/loading-overlay';

export default function MenuPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const user = await authApi.getCurrentUser();
        const restaurants = await restaurantsApi.list();
        if (cancelled) return;
        if (restaurants.length === 0) {
          setRestaurant(null);
          return;
        }
        const preferred =
          user.tenant_id != null ? restaurants.find((r) => r.id === user.tenant_id) : null;
        setRestaurant(preferred ?? restaurants[0]);
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingOverlay />;

  if (errorMessage) {
    return (
      <div className="p-6">
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Kein Restaurant gefunden.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <MenuList restaurantId={restaurant.id} />
      </div>
    </div>
  );
}
