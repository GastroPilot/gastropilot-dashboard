import { api } from "./client";
import { getApiBaseUrl, API_PREFIX, buildApiUrl } from "./config";

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  slug: string | null;
  public_booking_enabled: boolean;
  booking_lead_time_hours: number;
  booking_max_party_size: number;
  booking_default_duration: number;
  opening_hours: Record<string, { open: string; close: string }> | null;
  // SumUp Integration
  // Merchant Code wird serverseitig verwaltet (nicht im Frontend sichtbar)
  sumup_enabled: boolean;
  sumup_default_reader_id: string | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface RestaurantCreate {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  slug?: string | null;
  public_booking_enabled?: boolean;
  booking_lead_time_hours?: number;
  booking_max_party_size?: number;
  booking_default_duration?: number;
  opening_hours?: Record<string, { open: string; close: string }> | null;
  // SumUp Integration
  // API Key und Merchant Code werden serverseitig verwaltet (nicht im Frontend konfigurierbar)
  sumup_enabled?: boolean;
  sumup_default_reader_id?: string | null;
}

export type RestaurantUpdate = Partial<RestaurantCreate>;

export const restaurantsApi = {
  list: async (): Promise<Restaurant[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Restaurant[]>("/restaurants/");
  },

  get: async (id: string): Promise<Restaurant> => {
    return api.get<Restaurant>(`/restaurants/${id}`);
  },

  create: async (data: RestaurantCreate): Promise<Restaurant> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Restaurant>("/restaurants/", data);
  },

  update: async (id: string, data: Partial<RestaurantCreate>): Promise<Restaurant> => {
    return api.patch<Restaurant>(`/restaurants/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete(`/restaurants/${id}`);
  },

  /**
   * Holt den Restaurantnamen öffentlich (ohne Authentifizierung).
   * Optional: slug → gibt den Namen des spezifischen Restaurants zurück.
   * Gibt { name, found } zurück.
   */
  getPublicName: async (slug?: string): Promise<{ name: string; found: boolean }> => {
    try {
      const path = slug
        ? `/restaurants/public/name?slug=${encodeURIComponent(slug)}`
        : "/restaurants/public/name";
      const url = buildApiUrl(getApiBaseUrl(), API_PREFIX, path);
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) return { name: "GastroPilot", found: false };
      const data = await response.json();
      return { name: data.name || "GastroPilot", found: data.found ?? false };
    } catch {
      return { name: "GastroPilot", found: false };
    }
  },
};
