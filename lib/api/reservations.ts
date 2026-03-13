import { api } from "./client";
import { UpsellPackage } from "./upsell-packages";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "canceled"
  | "cancelled"
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
  voucher_id: string | null;
  voucher_discount_amount: number | null;
  prepayment_required: boolean;
  prepayment_amount: number | null;
  upsell_packages: UpsellPackage[] | null;
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

type ReservationApiPayload = Omit<ReservationCreate, "start_at" | "end_at" | "channel"> & {
  starts_at?: string;
  ends_at?: string;
  source?: string;
};

type ReservationApiUpdatePayload = Omit<ReservationUpdate, "start_at" | "end_at"> & {
  starts_at?: string;
  ends_at?: string;
};

function normalizeReservation(reservation: Reservation): Reservation {
  if (reservation.status === "cancelled") {
    return { ...reservation, status: "canceled" };
  }
  return reservation;
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
    const response = await api.get<Reservation[]>(`/reservations/${query ? `?${query}` : ""}`);
    return response.map(normalizeReservation);
  },

  get: async (_restaurantId: string, reservationId: string): Promise<Reservation> => {
    const response = await api.get<Reservation>(`/reservations/${reservationId}`);
    return normalizeReservation(response);
  },

  create: async (
    _restaurantId: string,
    data: ReservationCreate
  ): Promise<Reservation> => {
    const payload: ReservationApiPayload = {
      ...data,
      starts_at: data.start_at,
      ends_at: data.end_at,
      source: data.channel,
    };
    const response = await api.post<Reservation>(`/reservations/`, payload);
    return normalizeReservation(response);
  },

  update: async (
    _restaurantId: string,
    reservationId: string,
    data: ReservationUpdate
  ): Promise<Reservation> => {
    const payload: ReservationApiUpdatePayload = {
      ...data,
      starts_at: data.start_at,
      ends_at: data.end_at,
    };
    const response = await api.patch<Reservation>(`/reservations/${reservationId}`, payload);
    return normalizeReservation(response);
  },

  delete: async (_restaurantId: string, reservationId: string): Promise<void> => {
    return api.delete(`/reservations/${reservationId}`);
  },

  cancel: async (
    _restaurantId: string,
    reservationId: string,
    canceledReason?: string
  ): Promise<Reservation> => {
    const response = await api.patch<Reservation>(
      `/reservations/${reservationId}`,
      {
        status: "canceled",
        ...(canceledReason ? { notes: canceledReason } : {}),
      }
    );
    return normalizeReservation(response);
  },
};
