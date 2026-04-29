'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AllergenMultiSelect } from './allergen-multi-select';
import {
  useMenuCategories,
  useCreateMenuItem,
  useDeleteMenuItem,
  useMenuItem,
  useUpdateMenuItem,
} from '@/lib/hooks/queries/use-menu-items';
import { ALLERGEN_CODES, type AllergenCode } from '@/lib/allergens';
import type { MenuItemCreate, MenuItemUpdate } from '@/lib/api/menu';
import { confirmAction } from '@/lib/utils';

const TAX_RATES = [
  { value: 0.19, label: '19 % (Standard)' },
  { value: 0.07, label: '7 % (ermaessigt)' },
  { value: 0, label: '0 % (steuerfrei)' },
] as const;

interface MenuItemEditorProps {
  restaurantId: string;
  /** Wenn `undefined` -> Neu-anlegen-Modus. */
  itemId?: string;
}

interface FormState {
  name: string;
  description: string;
  /** Eingabe als String, um leere Felder + Komma als Dezimaltrenner zu erlauben. */
  priceInput: string;
  taxRate: number;
  categoryId: string | '';
  isAvailable: boolean;
  allergens: AllergenCode[];
}

const EMPTY_STATE: FormState = {
  name: '',
  description: '',
  priceInput: '',
  taxRate: 0.19,
  categoryId: '',
  isAvailable: true,
  allergens: [],
};

// DE-Codes aus Bestandsdaten -> EU-14-EN-Singular. Spiegelt das Backend-Mapping
// in services/core/app/services/allergen_service.ALLERGEN_ALIASES, damit Items,
// die noch nicht durch das Backend normalisiert wurden, im Editor korrekt
// vorausgewaehlt erscheinen.
const ALLERGEN_LEGACY_ALIASES: Record<string, AllergenCode> = {
  milch: 'milk',
  laktose: 'milk',
  lactose: 'milk',
  eier: 'eggs',
  ei: 'eggs',
  nuesse: 'nuts',
  nüsse: 'nuts',
  schalenfruechte: 'nuts',
  schalenfrüchte: 'nuts',
  erdnuesse: 'peanuts',
  erdnüsse: 'peanuts',
  sojabohnen: 'soy',
  weichtiere: 'molluscs',
  krebstiere: 'crustaceans',
  schwefeldioxid: 'sulfites',
  sulphites: 'sulfites',
  sulfit: 'sulfites',
  sellerie: 'celery',
  senf: 'mustard',
  sesam: 'sesame',
  lupinen: 'lupin',
  lupins: 'lupin',
};

const sanitizeAllergens = (
  raw: string[] | { contains?: unknown[] } | null | undefined,
): AllergenCode[] => {
  if (!raw) return [];
  // Legacy-Object-Format aus Seed-Daten: {"contains": [...], "may_contain": [...]}
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.contains) ? raw.contains : [];
  const set = new Set<AllergenCode>();
  for (const code of list) {
    if (typeof code !== 'string') continue;
    const normalized = code.trim().toLowerCase();
    const mapped = (ALLERGEN_CODES as readonly string[]).includes(normalized)
      ? (normalized as AllergenCode)
      : ALLERGEN_LEGACY_ALIASES[normalized];
    if (mapped) set.add(mapped);
  }
  return ALLERGEN_CODES.filter((c) => set.has(c));
};

const parsePrice = (input: string): number | null => {
  if (!input.trim()) return null;
  const normalized = input.replace(',', '.').trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
};

export function MenuItemEditor({ restaurantId, itemId }: MenuItemEditorProps) {
  const router = useRouter();
  const isEditMode = !!itemId;

  const { data: existingItem, isLoading: isLoadingItem } = useMenuItem(restaurantId, itemId);
  const { data: categories } = useMenuCategories(restaurantId);

  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [isInitialized, setIsInitialized] = useState(!isEditMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  useEffect(() => {
    if (!isEditMode) return;
    if (!existingItem || isInitialized) return;
    setForm({
      name: existingItem.name,
      description: existingItem.description ?? '',
      priceInput: existingItem.price.toFixed(2).replace('.', ','),
      taxRate: existingItem.tax_rate,
      categoryId: existingItem.category_id ?? '',
      isAvailable: existingItem.is_available,
      allergens: sanitizeAllergens(existingItem.allergens),
    });
    setIsInitialized(true);
  }, [existingItem, isEditMode, isInitialized]);

  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const validation = useMemo(() => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) {
      errors.name = 'Name ist erforderlich';
    }
    const price = parsePrice(form.priceInput);
    if (price === null) {
      errors.priceInput = 'Preis ist erforderlich (z. B. 9,90)';
    }
    return errors;
  }, [form.name, form.priceInput]);

  const isValid = Object.keys(validation).length === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setErrorMessage(null);

    const price = parsePrice(form.priceInput);
    if (price === null) return;

    const payload: MenuItemCreate & MenuItemUpdate = {
      name: form.name.trim(),
      description: form.description.trim() ? form.description.trim() : null,
      price,
      tax_rate: form.taxRate,
      category_id: form.categoryId || null,
      is_available: form.isAvailable,
      allergens: form.allergens,
    };

    try {
      if (isEditMode && itemId) {
        await updateMutation.mutateAsync({
          restaurantId,
          itemId,
          data: payload,
        });
      } else {
        const created = await createMutation.mutateAsync({
          restaurantId,
          data: payload,
        });
        router.replace(`/dashboard/menu/${created.id}`);
        return;
      }
      router.push('/dashboard/menu');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen';
      setErrorMessage(message);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !itemId) return;
    if (!confirmAction('Gericht wirklich loeschen?')) return;
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync({ restaurantId, itemId });
      router.push('/dashboard/menu');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Loeschen fehlgeschlagen';
      setErrorMessage(message);
    }
  };

  if (isEditMode && isLoadingItem && !existingItem) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Lade Gericht...
      </div>
    );
  }

  if (isEditMode && !isLoadingItem && !existingItem) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Gericht nicht gefunden oder keine Berechtigung.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="menu-item-name" className="text-sm font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="menu-item-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={200}
              required
              aria-invalid={!!validation.name}
              aria-describedby={validation.name ? 'menu-item-name-error' : undefined}
            />
            {validation.name && (
              <p id="menu-item-name-error" className="text-xs text-destructive" role="alert">
                {validation.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="menu-item-description" className="text-sm font-medium text-foreground">
              Beschreibung
            </label>
            <textarea
              id="menu-item-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              maxLength={2000}
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="menu-item-price" className="text-sm font-medium text-foreground">
                Preis brutto (EUR) <span className="text-destructive">*</span>
              </label>
              <Input
                id="menu-item-price"
                inputMode="decimal"
                value={form.priceInput}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priceInput: e.target.value,
                  }))
                }
                placeholder="9,90"
                required
                aria-invalid={!!validation.priceInput}
                aria-describedby={validation.priceInput ? 'menu-item-price-error' : undefined}
              />
              {validation.priceInput && (
                <p id="menu-item-price-error" className="text-xs text-destructive" role="alert">
                  {validation.priceInput}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="menu-item-tax" className="text-sm font-medium text-foreground">
                MwSt
              </label>
              <Select
                id="menu-item-tax"
                value={String(form.taxRate)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    taxRate: Number.parseFloat(e.target.value),
                  }))
                }
              >
                {TAX_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="menu-item-category" className="text-sm font-medium text-foreground">
                Kategorie
              </label>
              <Select
                id="menu-item-category"
                value={form.categoryId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
              >
                <option value="">— ohne Kategorie —</option>
                {(categories ?? [])
                  .filter((cat) => cat.is_active)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isAvailable: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border border-input accent-primary"
            />
            <span>Aktiv / verfuegbar</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Allergene</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pflichtangaben gemaess EU-Lebensmittel-Informationsverordnung (LMIV). Mehrfachauswahl
            moeglich.
          </p>
        </CardHeader>
        <CardContent>
          <AllergenMultiSelect
            value={form.allergens}
            onChange={(next) => setForm((prev) => ({ ...prev, allergens: next }))}
          />
        </CardContent>
      </Card>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isEditMode && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Loeschen
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/menu')}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button type="submit" variant="primary" disabled={!isValid || isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditMode ? 'Speichern' : 'Anlegen'}
          </Button>
        </div>
      </div>
    </form>
  );
}
