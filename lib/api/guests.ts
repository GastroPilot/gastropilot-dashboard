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

interface GuestListApiResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
}

function splitGuestName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first_name: "", last_name: "" };
  }
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function toGuest(response: GuestListApiResponse): Guest {
  const names = splitGuestName(response.name ?? "");
  return {
    id: response.id,
    restaurant_id: "",
    first_name: names.first_name,
    last_name: names.last_name,
    email: response.email,
    phone: response.phone,
    notes: response.notes ?? null,
    created_at_utc: "",
    updated_at_utc: "",
  };
}

export const guestsApi = {
  list: async (_restaurantId: string): Promise<Guest[]> => {
    const response = await api.get<GuestListApiResponse[]>(`/guests/`);
    return response.map(toGuest);
  },

  get: async (_restaurantId: string, guestId: string): Promise<Guest> => {
    const response = await api.get<GuestListApiResponse>(`/guests/${guestId}`);
    return toGuest(response);
  },

  create: async (_restaurantId: string, _data: GuestCreate): Promise<Guest> => {
    throw new Error("Guest create endpoint is not available in the current backend.");
  },

  update: async (
    _restaurantId: string,
    guestId: string,
    data: GuestUpdate
  ): Promise<Guest> => {
    await api.patch(`/guests/${guestId}`, {
      notes: data.notes ?? null,
    });
    const response = await api.get<GuestListApiResponse>(`/guests/${guestId}`);
    return toGuest(response);
  },

  delete: async (_restaurantId: string, _guestId: string): Promise<void> => {
    throw new Error("Guest delete endpoint is not available in the current backend.");
  },
};
