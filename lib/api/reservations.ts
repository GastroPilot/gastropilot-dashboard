import { api } from "./client";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "canceled"
  | "no_show";

export interface Reservation {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  guest_id: string | null;
  start_at: string;
  end_at: string;
  party_size: number;
  status: ReservationStatus;
  channel: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  notes: string | null;
  tags: string[];
  confirmed_at: string | null;
  seated_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface ReservationCreate {
  table_id?: string | null;
  guest_id?: string | null;
  start_at: string;
  end_at: string;
  party_size: number;
  status?: ReservationStatus;
  channel?: string;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  special_requests?: string | null;
  notes?: string | null;
  tags?: string[];
}

export interface ReservationUpdate {
  table_id?: string | null;
  guest_id?: string | null;
  start_at?: string;
  end_at?: string;
  party_size?: number;
  status?: ReservationStatus;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  special_requests?: string | null;
  notes?: string | null;
  tags?: string[];
}

export const reservationsApi = {
  list: async (
    _restaurantId: string,
    params?: { from?: string; to?: string; status?: ReservationStatus; table_id?: string }
  ): Promise<Reservation[]> => {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.table_id) queryParams.append("table_id", params.table_id);

    const query = queryParams.toString();
    return api.get<Reservation[]>(`/reservations${query ? `?${query}` : ""}`);
  },

  get: async (_restaurantId: string, reservationId: string): Promise<Reservation> => {
    return api.get<Reservation>(`/reservations/${reservationId}`);
  },

  create: async (
    _restaurantId: string,
    data: ReservationCreate
  ): Promise<Reservation> => {
    return api.post<Reservation>("/reservations", data);
  },

  update: async (
    _restaurantId: string,
    reservationId: string,
    data: ReservationUpdate
  ): Promise<Reservation> => {
    return api.patch<Reservation>(`/reservations/${reservationId}`, data);
  },

  delete: async (_restaurantId: string, reservationId: string): Promise<void> => {
    return api.delete(`/reservations/${reservationId}`);
  },

  cancel: async (
    _restaurantId: string,
    reservationId: string,
    canceledReason?: string
  ): Promise<Reservation> => {
    return api.post<Reservation>(
      `/reservations/${reservationId}/cancel`,
      canceledReason ? { canceled_reason: canceledReason } : {}
    );
  },
};
