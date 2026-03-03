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
  list: async (_restaurantId: string): Promise<Guest[]> => {
    return api.get<Guest[]>("/guests");
  },

  get: async (_restaurantId: string, guestId: string): Promise<Guest> => {
    return api.get<Guest>(`/guests/${guestId}`);
  },

  create: async (_restaurantId: string, data: GuestCreate): Promise<Guest> => {
    return api.post<Guest>("/guests", data);
  },

  update: async (
    _restaurantId: string,
    guestId: string,
    data: GuestUpdate
  ): Promise<Guest> => {
    return api.patch<Guest>(`/guests/${guestId}`, data);
  },

  delete: async (_restaurantId: string, guestId: string): Promise<void> => {
    return api.delete(`/guests/${guestId}`);
  },
};
