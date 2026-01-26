import { api } from "./client";
import { UpsellPackage } from "./upsell-packages";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "canceled"
  | "no_show";

export interface Reservation {
  id: number;
  restaurant_id: number;
  table_id: number | null;
  guest_id: number | null;
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
  voucher_id: number | null;
  voucher_discount_amount: number | null;
  prepayment_required: boolean;
  prepayment_amount: number | null;
  upsell_packages: UpsellPackage[] | null;
}

export interface ReservationCreate {
  table_id?: number | null;
  guest_id?: number | null;
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
  table_id?: number | null;
  guest_id?: number | null;
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
    restaurantId: number,
    params?: { from?: string; to?: string; status?: ReservationStatus; table_id?: number }
  ): Promise<Reservation[]> => {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.table_id) queryParams.append("table_id", params.table_id.toString());
    
    const query = queryParams.toString();
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Reservation[]>(
      `/restaurants/${restaurantId}/reservations/${query ? `?${query}` : ""}`
    );
  },

  get: async (restaurantId: number, reservationId: number): Promise<Reservation> => {
    return api.get<Reservation>(
      `/restaurants/${restaurantId}/reservations/${reservationId}`
    );
  },

  create: async (
    restaurantId: number,
    data: ReservationCreate
  ): Promise<Reservation> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Reservation>(
      `/restaurants/${restaurantId}/reservations/`,
      data
    );
  },

  update: async (
    restaurantId: number,
    reservationId: number,
    data: ReservationUpdate
  ): Promise<Reservation> => {
    return api.patch<Reservation>(
      `/restaurants/${restaurantId}/reservations/${reservationId}`,
      data
    );
  },

  delete: async (restaurantId: number, reservationId: number): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/reservations/${reservationId}`);
  },

  cancel: async (
    restaurantId: number,
    reservationId: number,
    canceledReason?: string
  ): Promise<Reservation> => {
    return api.post<Reservation>(
      `/restaurants/${restaurantId}/reservations/${reservationId}/cancel`,
      canceledReason ? { canceled_reason: canceledReason } : {}
    );
  },
};
