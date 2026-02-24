import { api } from "./client";

export interface TenantSettings {
  // Allgemein
  timezone: string;
  currency: string;
  language: string;
  logo_url: string | null;
  primary_color: string | null;
  // Buchung
  public_booking_enabled: boolean;
  booking_lead_time_hours: number;
  booking_max_party_size: number;
  booking_default_duration_minutes: number;
  opening_hours: OpeningHours | null;
  // Bestellungen
  order_number_prefix: string;
  receipt_footer: string | null;
  tax_rate: number;
  // Benachrichtigungen
  notify_new_reservation_email: boolean;
  notify_new_order_push: boolean;
  // Zusätzliche freie Felder
  [key: string]: unknown;
}

export interface OpeningHours {
  monday?: DayHours | null;
  tuesday?: DayHours | null;
  wednesday?: DayHours | null;
  thursday?: DayHours | null;
  friday?: DayHours | null;
  saturday?: DayHours | null;
  sunday?: DayHours | null;
}

export interface DayHours {
  open: string;   // z.B. "11:00"
  close: string;  // z.B. "22:00"
  closed?: boolean;
}

export type TenantSettingsUpdate = Partial<Omit<TenantSettings, "[key: string]">>;

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: "Europe/Berlin",
  currency: "EUR",
  language: "de",
  logo_url: null,
  primary_color: null,
  public_booking_enabled: false,
  booking_lead_time_hours: 2,
  booking_max_party_size: 12,
  booking_default_duration_minutes: 120,
  opening_hours: null,
  order_number_prefix: "B",
  receipt_footer: null,
  tax_rate: 19.0,
  notify_new_reservation_email: true,
  notify_new_order_push: true,
};

export const tenantSettingsApi = {
  /**
   * Lädt alle Tenant-Einstellungen für ein Restaurant.
   */
  async getSettings(restaurantId: string): Promise<TenantSettings> {
    return api.get<TenantSettings>(`/restaurants/${restaurantId}/settings`);
  },

  /**
   * Aktualisiert Tenant-Einstellungen (partial update).
   * Nur übergebene Felder werden geändert.
   */
  async updateSettings(
    restaurantId: string,
    data: TenantSettingsUpdate
  ): Promise<TenantSettings> {
    return api.patch<TenantSettings>(`/restaurants/${restaurantId}/settings`, data);
  },
};
