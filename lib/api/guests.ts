import { api } from "./client";

export interface Guest {
  id: number;
  restaurant_id: number;
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
  list: async (restaurantId: number): Promise<Guest[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Guest[]>(`/restaurants/${restaurantId}/guests/`);
  },

  get: async (restaurantId: number, guestId: number): Promise<Guest> => {
    return api.get<Guest>(`/restaurants/${restaurantId}/guests/${guestId}`);
  },

  create: async (restaurantId: number, data: GuestCreate): Promise<Guest> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Guest>(`/restaurants/${restaurantId}/guests/`, data);
  },

  update: async (
    restaurantId: number,
    guestId: number,
    data: GuestUpdate
  ): Promise<Guest> => {
    return api.patch<Guest>(`/restaurants/${restaurantId}/guests/${guestId}`, data);
  },

  delete: async (restaurantId: number, guestId: number): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/guests/${guestId}`);
  },
};
