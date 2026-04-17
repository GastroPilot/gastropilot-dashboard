"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/dashboard-store";
import { cn } from "@/lib/utils";

const options = [
  { value: "light" as const, label: "Hell", Icon: Sun },
  { value: "dark" as const, label: "Dunkel", Icon: Moon },
  { value: "system" as const, label: "System", Icon: Monitor },
] as const;

export function ThemeSwitch() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = options.find((o) => o.value === theme) ?? options[2];
  const CurrentIcon = current.Icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground",
          "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          "transition-colors touch-manipulation min-h-[36px] min-w-[36px] md:min-h-[40px] md:min-w-[40px]",
          open && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
        aria-label="Design wechseln"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CurrentIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-card shadow-xl z-50 py-1"
          aria-label="Design auswählen"
        >
          {options.map(({ value, label, Icon }) => (
            <button
              key={value}
              role="option"
              aria-selected={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                "hover:bg-accent text-foreground",
                theme === value && "bg-accent font-medium"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check className="h-4 w-4 text-primary-contrast shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
