import { api } from "./client";

/**
 * Verfügbare Module in GastroPilot
 * 
 * - reservations_module: Reservierungsmodul (Tischplan, Kalender, Warteliste, Gäste-Verwaltung)
 * - orders_module: Bestellungs-/Menümodul (Bestellsystem, Menüverwaltung, Statistiken)
 * - web_reservation_module: Web-Reservierungsformular für die Website
 * - whatsapp_bot_module: WhatsApp-Reservierungsbot
 * - phone_bot_module: Telefon-Reservierungsbot
 */
export interface Features {
  reservations_module: boolean;
  orders_module: boolean;
  web_reservation_module: boolean;
  whatsapp_bot_module: boolean;
  phone_bot_module: boolean;
}

export interface LicenseInfo {
  features: Features;
  package: string | null;
  customer: {
    customer_number: string | null;
    customer_name: string | null;
    package: string | null;
  };
  available_modules: string[];
}

// Default Features (alle deaktiviert)
const DEFAULT_FEATURES: Features = {
  reservations_module: false,
  orders_module: false,
  web_reservation_module: false,
  whatsapp_bot_module: false,
  phone_bot_module: false,
};

// Development Features (alle aktiviert)
const DEV_FEATURES: Features = {
  reservations_module: true,
  orders_module: true,
  web_reservation_module: true,
  whatsapp_bot_module: true,
  phone_bot_module: true,
};

export const licenseApi = {
  /**
   * Ruft die aktuell aktivierten Features vom Backend ab
   */
  async getFeatures(): Promise<Features> {
    try {
      const response = await api.get<Features>("/license/features/");
      return response;
    } catch (error) {
      console.error("Fehler beim Laden der License-Features:", error);
      // Fallback: Alle Features aktiviert (für Development)
      return DEV_FEATURES;
    }
  },

  /**
   * Ruft erweiterte Lizenz-Informationen ab (inkl. Paket und Kundeninfo)
   */
  async getLicenseInfo(): Promise<LicenseInfo> {
    try {
      const response = await api.get<LicenseInfo>("/license/info/");
      return response;
    } catch (error) {
      console.error("Fehler beim Laden der Lizenz-Informationen:", error);
      return {
        features: DEV_FEATURES,
        package: "development",
        customer: {
          customer_number: null,
          customer_name: null,
          package: null,
        },
        available_modules: Object.keys(DEFAULT_FEATURES),
      };
    }
  },
};
