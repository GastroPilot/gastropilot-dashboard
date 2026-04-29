/**
 * EU-14 Allergene nach der Lebensmittel-Informationsverordnung (LMIV).
 *
 * Kanonisches Code-Set: Englisch-Singular, vereinheitlicht mit
 * `table-order/lib/allergens.ts` und `app/constants/allergens.ts`
 * (Mobile). Backend-Aliase werden serverseitig (`allergen_service`)
 * auf diese Codes gemappt.
 */

export const ALLERGEN_CODES = [
  'gluten',
  'milk',
  'nuts',
  'peanuts',
  'soy',
  'eggs',
  'fish',
  'crustaceans',
  'molluscs',
  'celery',
  'mustard',
  'sesame',
  'sulfites',
  'lupin',
] as const;

export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export const ALLERGEN_LABELS_DE: Record<AllergenCode, string> = {
  gluten: 'Glutenhaltiges Getreide',
  milk: 'Milch und Milcherzeugnisse',
  nuts: 'Schalenfruechte',
  peanuts: 'Erdnuesse',
  soy: 'Soja',
  eggs: 'Eier',
  fish: 'Fisch',
  crustaceans: 'Krebstiere',
  molluscs: 'Weichtiere',
  celery: 'Sellerie',
  mustard: 'Senf',
  sesame: 'Sesam',
  sulfites: 'Schwefeldioxid und Sulfite',
  lupin: 'Lupinen',
};

export interface AllergenDefinition {
  code: AllergenCode;
  name: string;
  short: string;
  icon: string;
  bgColor: string;
  textColor: string;
}

export const EU_ALLERGENS: Record<AllergenCode, AllergenDefinition> = {
  gluten: {
    code: 'gluten',
    name: ALLERGEN_LABELS_DE.gluten,
    short: 'GL',
    icon: 'A',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
  },
  milk: {
    code: 'milk',
    name: ALLERGEN_LABELS_DE.milk,
    short: 'MI',
    icon: 'G',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-800',
  },
  nuts: {
    code: 'nuts',
    name: ALLERGEN_LABELS_DE.nuts,
    short: 'SF',
    icon: 'H',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
  },
  peanuts: {
    code: 'peanuts',
    name: ALLERGEN_LABELS_DE.peanuts,
    short: 'ER',
    icon: 'E',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
  },
  soy: {
    code: 'soy',
    name: ALLERGEN_LABELS_DE.soy,
    short: 'SO',
    icon: 'F',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  eggs: {
    code: 'eggs',
    name: ALLERGEN_LABELS_DE.eggs,
    short: 'EI',
    icon: 'C',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  fish: {
    code: 'fish',
    name: ALLERGEN_LABELS_DE.fish,
    short: 'FI',
    icon: 'D',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  crustaceans: {
    code: 'crustaceans',
    name: ALLERGEN_LABELS_DE.crustaceans,
    short: 'KR',
    icon: 'B',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
  molluscs: {
    code: 'molluscs',
    name: ALLERGEN_LABELS_DE.molluscs,
    short: 'WT',
    icon: 'N',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
  },
  celery: {
    code: 'celery',
    name: ALLERGEN_LABELS_DE.celery,
    short: 'SE',
    icon: 'I',
    bgColor: 'bg-lime-100',
    textColor: 'text-lime-800',
  },
  mustard: {
    code: 'mustard',
    name: ALLERGEN_LABELS_DE.mustard,
    short: 'SN',
    icon: 'J',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  sesame: {
    code: 'sesame',
    name: ALLERGEN_LABELS_DE.sesame,
    short: 'SS',
    icon: 'K',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-800',
  },
  sulfites: {
    code: 'sulfites',
    name: ALLERGEN_LABELS_DE.sulfites,
    short: 'SU',
    icon: 'L',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
  },
  lupin: {
    code: 'lupin',
    name: ALLERGEN_LABELS_DE.lupin,
    short: 'LU',
    icon: 'M',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
  },
};

export const ALLERGEN_LIST = ALLERGEN_CODES.map((code) => EU_ALLERGENS[code]);
