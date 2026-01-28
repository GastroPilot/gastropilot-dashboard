import { api } from './client';
import { API_BASE_URL, API_PREFIX, buildApiUrl } from './config';

export interface Restaurant {
  id: number;
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
    return api.get<Restaurant[]>('/restaurants/');
  },

  get: async (id: number): Promise<Restaurant> => {
    return api.get<Restaurant>(`/restaurants/${id}`);
  },

  create: async (data: RestaurantCreate): Promise<Restaurant> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Restaurant>('/restaurants/', data);
  },

  update: async (id: number, data: Partial<RestaurantCreate>): Promise<Restaurant> => {
    return api.patch<Restaurant>(`/restaurants/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return api.delete(`/restaurants/${id}`);
  },

  /**
   * Holt den Restaurantnamen öffentlich (ohne Authentifizierung).
   * Wird z.B. auf der Loginseite verwendet.
   */
  getPublicName: async (): Promise<string> => {
    try {
      const url = buildApiUrl(API_BASE_URL, API_PREFIX, '/restaurants/public/name');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Wichtig für CORS mit credentials (auch für public endpoints)
      });

      if (!response.ok) {
        return 'GastroPilot';
      }

      const data = await response.json();
      return data.name || 'GastroPilot';
    } catch (error) {
      console.error('Fehler beim Laden des Restaurantnamens:', error);
      return 'GastroPilot';
    }
  },
};
