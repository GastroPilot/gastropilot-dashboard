"use client";

import { cn, type AllergenId } from "@/lib/utils";

const EU_14_ALLERGENS: { id: AllergenId; label: string; icon: string }[] = [
  { id: "gluten", label: "Gluten", icon: "\uD83C\uDF3E" },
  { id: "crustaceans", label: "Krebstiere", icon: "\uD83E\uDD90" },
  { id: "eggs", label: "Eier", icon: "\uD83E\uDD5A" },
  { id: "fish", label: "Fisch", icon: "\uD83D\uDC1F" },
  { id: "peanuts", label: "Erdnüsse", icon: "\uD83E\uDD5C" },
  { id: "soy", label: "Soja", icon: "\uD83E\uDED8" },
  { id: "milk", label: "Milch", icon: "\uD83E\uDD5B" },
  { id: "nuts", label: "Schalenfrüchte", icon: "\uD83C\uDF30" },
  { id: "celery", label: "Sellerie", icon: "\uD83E\uDD6C" },
  { id: "mustard", label: "Senf", icon: "\uD83D\uDFE1" },
  { id: "sesame", label: "Sesam", icon: "\u26AA" },
  { id: "sulphites", label: "Sulfite", icon: "\uD83C\uDF77" },
  { id: "lupin", label: "Lupinen", icon: "\uD83C\uDF38" },
  { id: "molluscs", label: "Weichtiere", icon: "\uD83D\uDC1A" },
];

interface AllergenFilterProps {
  selectedAllergens: AllergenId[];
  onToggle: (id: AllergenId) => void;
  className?: string;
}

export function AllergenFilter({ selectedAllergens, onToggle, className }: AllergenFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {EU_14_ALLERGENS.map((allergen) => {
        const isSelected = (selectedAllergens ?? []).includes(allergen.id);
        return (
          <button
            key={allergen.id}
            onClick={() => onToggle(allergen.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-pressed={isSelected}
          >
            <span>{allergen.icon}</span>
            <span>{allergen.label}</span>
          </button>
        );
      })}
    </div>
  );
}
