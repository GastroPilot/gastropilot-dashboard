/**
 * @deprecated License-Features wurden entfernt.
 * Verwende stattdessen tenantSettingsApi aus "@/lib/api/tenant-settings".
 *
 * Diese Datei bleibt als Stub, damit bestehende Imports nicht brechen.
 * Alle Features sind standardmäßig aktiviert.
 */

export interface Features {
  reservations_module: boolean;
  orders_module: boolean;
  web_reservation_module: boolean;
  whatsapp_bot_module: boolean;
  phone_bot_module: boolean;
}

const ALL_ENABLED: Features = {
  reservations_module: true,
  orders_module: true,
  web_reservation_module: true,
  whatsapp_bot_module: true,
  phone_bot_module: true,
};

export const licenseApi = {
  async getFeatures(): Promise<Features> {
    return ALL_ENABLED;
  },
};
