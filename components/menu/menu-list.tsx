'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Plus, Search, UtensilsCrossed, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMenuCategories, useMenuItems } from '@/lib/hooks/queries/use-menu-items';
import { EU_ALLERGENS, type AllergenCode } from '@/lib/allergens';
import type { MenuItem } from '@/lib/api/menu';
import { cn } from '@/lib/utils';

interface MenuListProps {
  restaurantId: string;
}

const formatPrice = (value: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);

const isKnownAllergen = (code: string): code is AllergenCode => code in EU_ALLERGENS;

interface AllergenChipsProps {
  allergens: MenuItem['allergens'];
}

function AllergenChips({ allergens }: AllergenChipsProps) {
  if (!allergens || allergens.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-3 w-3" />
        Ohne Tags
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map((code) => {
        if (!isKnownAllergen(code)) {
          return (
            <span
              key={code}
              className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              title={`Unbekannter Code: ${code}`}
            >
              {code}
            </span>
          );
        }
        const def = EU_ALLERGENS[code];
        return (
          <span
            key={code}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
              'border-border',
              def.bgColor,
              def.textColor
            )}
            title={def.name}
            aria-label={def.name}
          >
            <span className="font-bold">{def.short}</span>
          </span>
        );
      })}
    </div>
  );
}

export function MenuList({ restaurantId }: MenuListProps) {
  const { data: items, isLoading, isError, error } = useMenuItems(restaurantId);
  const { data: categories } = useMenuCategories(restaurantId);

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMissingAllergens, setOnlyMissingAllergens] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    (categories ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    let result = items ?? [];
    if (categoryFilter) {
      result = result.filter((item) => item.category_id === categoryFilter);
    }
    if (onlyMissingAllergens) {
      result = result.filter((item) => !item.allergens || item.allergens.length === 0);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) =>
        [item.name, item.description ?? ''].join(' ').toLowerCase().includes(query)
      );
    }
    return [...result].sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'de');
    });
  }, [items, categoryFilter, onlyMissingAllergens, searchQuery]);

  const missingAllergenCount = useMemo(() => {
    return (items ?? []).filter((item) => !item.allergens || item.allergens.length === 0).length;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Speisekarte</h1>
          <p className="text-sm text-muted-foreground">
            {items ? `${items.length} Gericht${items.length === 1 ? '' : 'e'}` : 'Lade...'}
            {missingAllergenCount > 0 && (
              <>
                {' • '}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {missingAllergenCount} ohne Allergen-Tag
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/menu/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-primary/80 bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-[1px] hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:px-4"
        >
          <Plus className="h-4 w-4" />
          Neues Gericht
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Name oder Beschreibung..."
            className="pl-10"
            aria-label="Suche"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Kategorie-Filter"
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Alle Kategorien</option>
          {(categories ?? [])
            .filter((cat) => cat.is_active)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => setOnlyMissingAllergens((prev) => !prev)}
          aria-pressed={onlyMissingAllergens}
          className={cn(
            'inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            onlyMissingAllergens
              ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'border-border bg-card text-foreground hover:bg-accent'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          Nur ohne Allergen-Tag
          {missingAllergenCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold">
              {missingAllergenCount}
            </span>
          )}
        </button>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          Lade Speisekarte...
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Fehler beim Laden: {error instanceof Error ? error.message : 'Unbekannter Fehler'}
        </div>
      )}

      {!isLoading && !isError && items && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Noch keine Gerichte angelegt.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege das erste Gericht an, um die Speisekarte zu fuellen.
          </p>
          <Link
            href="/dashboard/menu/new"
            className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-primary/80 bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-[1px] hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:px-4"
          >
            <Plus className="h-4 w-4" />
            Neues Gericht
          </Link>
        </div>
      )}

      {!isLoading && !isError && filteredItems.length === 0 && items && items.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Keine Gerichte fuer den aktuellen Filter.
        </div>
      )}

      {filteredItems.length > 0 && (
        <>
          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/menu/${item.id}`}
                className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    {item.category_id && categoryNameById.get(item.category_id) && (
                      <p className="text-xs text-muted-foreground">
                        {categoryNameById.get(item.category_id)}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-foreground">{formatPrice(item.price)}</span>
                </div>
                <div className="mt-2">
                  <AllergenChips allergens={item.allergens} />
                </div>
                <div className="mt-2 text-xs">
                  {item.is_available ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aktiv
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5" />
                      Inaktiv
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: Tabelle */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Kategorie</th>
                  <th className="px-4 py-3 font-medium text-right">Preis</th>
                  <th className="px-4 py-3 font-medium">Allergene</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-accent/40 focus-within:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/menu/${item.id}`}
                        className="block font-medium text-foreground focus-visible:outline-none focus-visible:underline"
                      >
                        {item.name}
                      </Link>
                      {item.description && (
                        <p className="mt-0.5 max-w-[480px] truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.category_id ? (categoryNameById.get(item.category_id) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-4 py-3">
                      <AllergenChips allergens={item.allergens} />
                    </td>
                    <td className="px-4 py-3">
                      {item.is_available ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                          Inaktiv
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
