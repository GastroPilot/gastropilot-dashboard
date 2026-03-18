/**
 * Zentrale Verwaltung aller Preisdaten
 * Diese Datei sollte als einzige Quelle für alle Preisinformationen dienen.
 */

import type { ComponentType, SVGProps } from 'react';
import {
  Calendar,
  ShoppingCart,
  Globe,
  MessageCircle,
  Phone,
  Tablet,
} from 'lucide-react';

export type PricingItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  priceNote?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  required?: string[];
};

export type BasePackage = {
  key: 'starter' | 'basic' | 'professional' | 'business' | 'premium';
  name: string;
  basePrice: number;
  priceInterval: 'month' | 'one-time';
  setupFee: number; // Einrichtungsgebühr in Cent (einmalig)
  badge?: string;
  tagline: string;
  features: string[];
  includedModules: string[]; // IDs der enthaltenen Module/Add-ons
  support: string;
  accent: string;
  highlighted?: boolean;
};

/**
 * Basis-Pakete mit enthaltenen Modulen
 */
export const packages: BasePackage[] = [
  {
    key: 'starter',
    name: 'Starter',
    basePrice: 12900, // in Cent, monatlich
    priceInterval: 'month',
    setupFee: 9900, // in Cent, einmalig
    badge: 'Beliebt',
    tagline: 'Perfekt für den Einstieg',
    features: [
      'Reservierungsmodul',
      'Visueller Tischplan mit Drag & Drop',
      'Kalender & Timeline (Tag, Woche, Liste)',
      'Warteliste mit Echtzeit-Updates',
      'Gäste-Verwaltung & Stammgast-Erkennung',
      'Hosting & Wartung durch GastroPilot',
      'Automatische Updates',
      'DSGVO-konformes EU-Hosting',
      'E-Mail- & Chat-Support (werktags)',
      'Einrichtung & Onboarding inklusive'
    ],
    includedModules: ['reservierungen'],
    support: 'E-Mail & Chat (werktags)',
    accent: 'from-blue-50 via-white to-blue-50',
    highlighted: false
  },
  {
    key: 'basic',
    name: 'Basic',
    basePrice: 17990, // in Cent, monatlich
    priceInterval: 'month',
    setupFee: 9900, // in Cent, einmalig
    badge: 'Basic',
    tagline: 'Für kleinere Restaurants',
    features: [
      'Alles aus Starter',
      'Reservierungsmodul',
      'Bestellungs-/Menümodul',
      'Bestellsystem & Menüverwaltung',
      'Rechnungserstellung & PDF-Export',
      'Statistiken & Analytics',
      'Hosting & Wartung durch GastroPilot',
      'Automatische Updates',
      'DSGVO-konformes EU-Hosting',
      'E-Mail- & Chat-Support (werktags)'
    ],
    includedModules: ['reservierungen', 'bestellungen'],
    support: 'E-Mail & Chat (werktags)',
    accent: 'from-blue-50 via-white to-blue-50',
    highlighted: false
  },
  {
    key: 'professional',
    name: 'Professional',
    basePrice: 21900, // in Cent, monatlich
    priceInterval: 'month',
    setupFee: 9900, // in Cent, einmalig
    badge: 'Empfohlen',
    tagline: 'Für wachsende Restaurants',
    features: [
      'Alles aus Basic',
      'Reservierungsmodul',
      'Bestellungs-/Menümodul',
      'Web-Reservierungsformular',
      'Responsive Widget für deine Website',
      'Automatische Tischvorschläge',
      'Vorauszahlung & Gutscheine',
      'Prioritäts-Support',
      'Persönlicher Projektmanager'
    ],
    includedModules: ['reservierungen', 'bestellungen', 'web-reservierung'],
    support: 'Prioritäts-Support (E-Mail, Chat, Telefon)',
    accent: 'from-orange-50 via-white to-orange-100',
    highlighted: true
  },
  {
    key: 'business',
    name: 'Business',
    basePrice: 32900, // in Cent, monatlich
    priceInterval: 'month',
    setupFee: 9900, // in Cent, einmalig
    badge: 'Business',
    tagline: 'Für etablierte Restaurants',
    features: [
      'Alles aus Professional',
      'Reservierungsmodul',
      'Bestellungs-/Menümodul',
      'Web-Reservierungsformular',
      'WhatsApp-Reservierungsbot',
      'Automatische Reservierungen per WhatsApp',
      '24/7 Verfügbarkeit',
      'Erweiterte Analytics & Reports',
      'Individuelle Anpassungen'
    ],
    includedModules: ['reservierungen', 'bestellungen', 'web-reservierung', 'whatsapp-reservierung'],
    support: 'Persönlicher Support (E-Mail, Chat, Telefon)',
    accent: 'from-purple-50 via-white to-purple-100',
  },
  {
    key: 'premium',
    name: 'Premium',
    basePrice: 44900, // in Cent, monatlich
    priceInterval: 'month',
    setupFee: 9900, // in Cent, einmalig
    badge: 'Premium',
    tagline: 'All-in-One für professionelle Restaurants',
    features: [
      'Alles aus Business',
      'Reservierungsmodul',
      'Bestellungs-/Menümodul',
      'Web-Reservierungsformular',
      'WhatsApp-Reservierungsbot',
      'Telefon-Reservierungsbot',
      'Spracherkennung & Dialogführung',
      '24/7 Erreichbarkeit',
      'Erweiterte Analytics & Reports',
      'Multi-Location Support',
      'Individuelle Anpassungen'
    ],
    includedModules: ['reservierungen', 'bestellungen', 'web-reservierung', 'whatsapp-reservierung', 'telefon-reservierung'],
    support: 'Persönlicher Support (E-Mail, Chat, Telefon)',
    accent: 'from-purple-50 via-white to-purple-100',
  }
];

/**
 * Hauptmodule
 */
export const modules: PricingItem[] = [
  {
    id: 'reservierungen',
    name: 'Reservierungsmodul',
    description: 'Tischplan, Reservierungen, Wartelisten, Kalender & Gäste-Verwaltung',
    price: 8900, // in Cent, monatlich
    icon: Calendar,
  },
  {
    id: 'bestellungen',
    name: 'Bestellungs-/Menümodul',
    description: 'Bestellsystem, Menüverwaltung, Rechnungserstellung & Statistiken',
    price: 11900, // in Cent, monatlich
    icon: ShoppingCart,
  },
];

/**
 * Add-ons für das Reservierungsmodul
 */
export const reservationAddons: PricingItem[] = [
  {
    id: 'web-reservierung',
    name: 'Web-Reservierungsformular',
    description: 'Eigenes Reservierungsformular für deine Website',
    price: 1900, // in Cent, monatlich
    icon: Globe,
    required: ['reservierungen'],
  },
  {
    id: 'whatsapp-reservierung',
    name: 'WhatsApp-Reservierungsbot',
    description: 'Automatische Reservierungen über WhatsApp',
    price: 2900, // in Cent, monatlich
    icon: MessageCircle,
    required: ['reservierungen'],
  },
  {
    id: 'telefon-reservierung',
    name: 'Telefon-Reservierungsbot',
    description: 'Automatische Reservierungen per Telefon',
    price: 5900, // in Cent, monatlich
    icon: Phone,
    required: ['reservierungen'],
  },
];

/**
 * Hardware-Miete (Tablets)
 */
export const hardwareRentals: PricingItem[] = [
  {
    id: 'ipad',
    name: 'iPad-Miete',
    description: 'Vorkonfigurierte iPads für dein Restaurant',
    price: 3990, // in Cent, monatlich pro iPad
    priceNote: 'pro iPad/Monat',
    icon: Tablet,
  },
  {
    id: 'samsung-tab',
    name: 'Samsung Galaxy Tab A11+ Miete',
    description: 'Vorkonfigurierte Samsung Galaxy Tab A11+ für dein Restaurant',
    price: 3490, // in Cent, monatlich pro Tablet
    priceNote: 'pro Tablet/Monat',
    icon: Tablet,
  },
];

/**
 * @deprecated Verwende stattdessen hardwareRentals
 * Wird für Rückwärtskompatibilität beibehalten
 */
export const ipadRental: PricingItem = hardwareRentals[0];

/**
 * Path for the pricing page
 */
export const PRICING_PATH = '/pricing';

/**
 * Mapping zwischen Webseite-Modul-IDs und Lizenz-Feature-Namen
 * 
 * Webseite (includedModules) -> Lizenz (feature_name)
 */
export const MODULE_TO_LICENSE_FEATURE: Record<string, string> = {
  'reservierungen': 'reservations_module',
  'bestellungen': 'orders_module',
  'web-reservierung': 'web_reservation_module',
  'whatsapp-reservierung': 'whatsapp_bot_module',
  'telefon-reservierung': 'phone_bot_module',
};

/**
 * Mapping zwischen Lizenz-Feature-Namen und Webseite-Modul-IDs
 */
export const LICENSE_FEATURE_TO_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_TO_LICENSE_FEATURE).map(([k, v]) => [v, k])
);

/**
 * Konvertiert Paket-Module (includedModules) in Lizenz-Features
 */
export function packageModulesToLicenseFeatures(
  includedModules: string[]
): Record<string, boolean> {
  const features: Record<string, boolean> = {
    reservations_module: false,
    orders_module: false,
    web_reservation_module: false,
    whatsapp_bot_module: false,
    phone_bot_module: false,
  };

  for (const moduleId of includedModules) {
    const featureName = MODULE_TO_LICENSE_FEATURE[moduleId];
    if (featureName) {
      features[featureName] = true;
    }
  }

  return features;
}

/**
 * Konvertiert Lizenz-Features in Paket-Module (includedModules)
 */
export function licenseFeaturestoPackageModules(
  features: Record<string, boolean>
): string[] {
  const modules: string[] = [];

  for (const [featureName, enabled] of Object.entries(features)) {
    if (enabled) {
      const moduleId = LICENSE_FEATURE_TO_MODULE[featureName];
      if (moduleId) {
        modules.push(moduleId);
      }
    }
  }

  return modules;
}

/**
 * Gibt das Paket für einen Paket-Key zurück
 */
export function getPackageByKey(key: BasePackage['key']): BasePackage | undefined {
  return packages.find(p => p.key === key);
}

/**
 * Gibt die Lizenz-Features für ein Paket zurück
 */
export function getLicenseFeaturesForPackage(
  packageKey: BasePackage['key']
): Record<string, boolean> {
  const pkg = getPackageByKey(packageKey);
  if (!pkg) {
    return {
      reservations_module: false,
      orders_module: false,
      web_reservation_module: false,
      whatsapp_bot_module: false,
      phone_bot_module: false,
    };
  }
  return packageModulesToLicenseFeatures(pkg.includedModules);
}