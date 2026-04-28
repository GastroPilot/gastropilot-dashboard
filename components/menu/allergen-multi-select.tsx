'use client';

import { Check } from 'lucide-react';
import { ALLERGEN_CODES, ALLERGEN_LIST, type AllergenCode } from '@/lib/allergens';
import { cn } from '@/lib/utils';

interface AllergenMultiSelectProps {
  value: AllergenCode[];
  onChange: (next: AllergenCode[]) => void;
  disabled?: boolean;
  /** Optionaler Heading-Text fuer Screenreader. */
  label?: string;
}

/**
 * Wiederverwendbare Multi-Select-Komponente fuer die 14 EU-Allergene.
 *
 * - Jeder Toggle ist ein `<button role="switch">` mit `aria-checked` und
 *   einem sprechenden `aria-label` ("Glutenhaltiges Getreide, ausgewaehlt").
 * - Wert ist `AllergenCode[]`. Reihenfolge wird stabil im Sinne von
 *   `ALLERGEN_CODES` gehalten, damit der Server immer den gleichen Output
 *   sieht (und das Diff im Audit-Log lesbar bleibt).
 */
export function AllergenMultiSelect({
  value,
  onChange,
  disabled = false,
  label = 'Allergene',
}: AllergenMultiSelectProps) {
  const selected = new Set<AllergenCode>(value);

  const toggle = (code: AllergenCode) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    // Stabil sortieren: in Reihenfolge der ALLERGEN_CODES.
    onChange(ALLERGEN_CODES.filter((c) => next.has(c)));
  };

  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ALLERGEN_LIST.map((allergen) => {
          const active = selected.has(allergen.code);
          const stateLabel = active ? 'ausgewaehlt' : 'nicht ausgewaehlt';
          return (
            <button
              key={allergen.code}
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={`${allergen.name}, ${stateLabel}`}
              onClick={() => toggle(allergen.code)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'border-primary bg-primary/15 text-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : `${allergen.bgColor} ${allergen.textColor}`
                )}
              >
                {active ? <Check className="h-3 w-3" /> : <span>{allergen.short}</span>}
              </span>
              <span className="truncate">{allergen.name}</span>
            </button>
          );
        })}
      </div>
      <p
        className="text-xs text-muted-foreground"
        aria-live="polite"
        data-testid="allergen-summary"
      >
        {value.length === 0
          ? 'Keine Allergene ausgewaehlt'
          : `${value.length} von ${ALLERGEN_LIST.length} ausgewaehlt`}
      </p>
    </div>
  );
}
