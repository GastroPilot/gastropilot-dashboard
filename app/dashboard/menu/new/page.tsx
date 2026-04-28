'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { restaurantsApi, type Restaurant } from '@/lib/api/restaurants';
import { MenuItemEditor } from '@/components/menu/menu-item-editor';
import { LoadingOverlay } from '@/components/loading-overlay';

export default function NewMenuItemPage() {
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

  if (errorMessage || !restaurant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{errorMessage ?? 'Kein Restaurant gefunden.'}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <Link
          href="/dashboard/menu"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurueck zur Speisekarte
        </Link>
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Neues Gericht</h1>
        <MenuItemEditor restaurantId={restaurant.id} />
      </div>
    </div>
  );
}
