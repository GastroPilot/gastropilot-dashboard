import { api } from "./client";

export interface Guest {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface GuestCreate {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface GuestUpdate {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export const guestsApi = {
  list: async (restaurantId: string): Promise<Guest[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Guest[]>(`/restaurants/${restaurantId}/guests/`);
  },

  get: async (restaurantId: string, guestId: string): Promise<Guest> => {
    return api.get<Guest>(`/restaurants/${restaurantId}/guests/${guestId}`);
  },

  create: async (restaurantId: string, data: GuestCreate): Promise<Guest> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Guest>(`/restaurants/${restaurantId}/guests/`, data);
  },

  update: async (
    restaurantId: string,
    guestId: string,
    data: GuestUpdate
  ): Promise<Guest> => {
    return api.patch<Guest>(`/restaurants/${restaurantId}/guests/${guestId}`, data);
  },

  delete: async (restaurantId: string, guestId: string): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/guests/${guestId}`);
  },
};
