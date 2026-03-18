"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALES = [
  { value: "de", label: "DE" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  // Detect current locale from pathname
  const segments = pathname.split("/");
  const currentLocale =
    LOCALES.find((l) => l.value === segments[1])?.value || "de";

  const handleChange = (newLocale: string) => {
    const parts = pathname.split("/");
    if (LOCALES.some((l) => l.value === parts[1])) {
      parts[1] = newLocale;
    } else {
      parts.splice(1, 0, newLocale);
    }
    router.push(parts.join("/"));
  };

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-16 px-2 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
