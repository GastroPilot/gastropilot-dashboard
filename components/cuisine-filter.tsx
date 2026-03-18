"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMMON_CUISINES = [
  "Deutsch",
  "Italienisch",
  "Türkisch",
  "Griechisch",
  "Japanisch",
  "Chinesisch",
  "Thailändisch",
  "Indisch",
  "Mexikanisch",
  "Französisch",
  "Spanisch",
  "Amerikanisch",
  "Vietnamesisch",
  "Koreanisch",
  "Mediterran",
];

interface CuisineFilterProps {
  value: string;
  onChange: (value: string) => void;
  cuisines?: string[];
}

export function CuisineFilter({
  value,
  onChange,
  cuisines,
}: CuisineFilterProps) {
  const options = cuisines?.length ? cuisines : COMMON_CUISINES;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Alle Küchen" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alle Küchen</SelectItem>
        {options.map((cuisine) => (
          <SelectItem key={cuisine} value={cuisine}>
            {cuisine}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
