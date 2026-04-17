"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption<T extends string = string> {
  id: T;
  label: string;
}

interface DropdownSelectorProps<T extends string = string> {
  options: DropdownOption<T>[];
  selectedId: T | null;
  onSelect: (id: T) => void;
  placeholder: string;
  menuPlacement?: "top" | "bottom";
  menuAlign?: "left" | "right";
  triggerClassName?: string;
  menuClassName?: string;
  menuWidthClassName?: string;
  containerClassName?: string;
  optionClassName?: string;
  zIndexClassName?: string;
  disabled?: boolean;
  showCheckIcon?: boolean;
  renderSelected?: (selected: DropdownOption<T> | null) => ReactNode;
  renderOption?: (option: DropdownOption<T>, selected: boolean) => ReactNode;
}

export function DropdownSelector<T extends string = string>({
  options,
  selectedId,
  onSelect,
  placeholder,
  menuPlacement = "bottom",
  menuAlign = "left",
  triggerClassName,
  menuClassName,
  menuWidthClassName = "w-full",
  containerClassName,
  optionClassName,
  zIndexClassName = "z-[120]",
  disabled = false,
  showCheckIcon = true,
  renderSelected,
  renderOption,
}: DropdownSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (options.length === 0 && open) {
      setOpen(false);
    }
  }, [open, options]);

  const resolvedDisabled = disabled || options.length === 0;
  const menuPositionClass = menuPlacement === "top" ? "bottom-full mb-2" : "top-full mt-1";
  const menuAlignClass = menuAlign === "right" ? "right-0" : "left-0";

  return (
    <div className={`relative ${containerClassName ?? ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          triggerClassName ??
          "inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
        }
        disabled={resolvedDisabled}
      >
        {renderSelected ? (
          renderSelected(selectedOption)
        ) : (
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`${zIndexClassName} absolute ${menuAlignClass} ${menuPositionClass} ${menuWidthClassName} rounded-lg border border-border bg-background shadow-xl overflow-hidden ${menuClassName ?? ""}`}
          role="listbox"
        >
          <div className="divide-y divide-border">
            {options.map((option) => {
              const active = selectedId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!active) onSelect(option.id);
                  }}
                  className={
                    optionClassName ??
                    `w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors ${
                      active ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent"
                    }`
                  }
                >
                  {renderOption ? (
                    renderOption(option, active)
                  ) : (
                    <>
                      <span className="truncate">{option.label}</span>
                      {showCheckIcon && active && <Check className="w-4 h-4 shrink-0 text-primary-contrast" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface AreaOption {
  id: string;
  name: string;
}

interface AreaSelectorProps {
  areas: AreaOption[];
  selectedAreaId: string | null;
  onSelect: (areaId: string) => void;
  placeholder?: string;
  menuPlacement?: "top" | "bottom";
  minWidthClassName?: string;
}

export function AreaSelector({
  areas,
  selectedAreaId,
  onSelect,
  placeholder = "Area auswählen",
  menuPlacement = "bottom",
  minWidthClassName = "min-w-[180px]",
}: AreaSelectorProps) {
  const options = useMemo(
    () => areas.map((area) => ({ id: area.id, label: area.name })),
    [areas],
  );

  return (
    <DropdownSelector
      options={options}
      selectedId={selectedAreaId}
      onSelect={onSelect}
      placeholder={placeholder}
      menuPlacement={menuPlacement}
      triggerClassName={`inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring ${minWidthClassName} disabled:opacity-60 disabled:cursor-not-allowed`}
    />
  );
}
