import { api } from "./client";
import type { AllergenId } from "@/lib/utils";

export interface TimeSlot {
  time: string; // "HH:mm"
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  slots: TimeSlot[];
}

export interface CreateReservationRequest {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  party_size: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  allergen_ids?: AllergenId[];
  special_requests?: string;
}

export interface Reservation {
  id: string;
  restaurant_name: string;
  restaurant_slug: string;
  date: string;
  time: string;
  party_size: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  allergen_ids: AllergenId[];
  special_requests: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "canceled" | "no_show";
  confirmation_code: string;
  created_at: string;
  updated_at: string;
}

export const reservationsApi = {
  /** Verfügbare Zeitfenster prüfen */
  checkAvailability: async (slug: string, date: string, partySize: number): Promise<AvailabilityResponse> => {
    return api.get<AvailabilityResponse>(
      `/public/restaurants/${slug}/availability?date=${date}&party_size=${partySize}`
    );
  },

  /** Reservierung erstellen (kann auch ohne Login) */
  create: async (slug: string, data: CreateReservationRequest): Promise<Reservation> => {
    const body = {
      desired_date: data.date,
      desired_time: data.time,
      party_size: data.party_size,
      guest_name: data.guest_name,
      guest_email: data.guest_email,
      guest_phone: data.guest_phone || "",
      special_requests: data.special_requests,
      channel: "web",
    };
    return api.post<Reservation>(`/public/restaurants/${slug}/reservations`, body);
  },

  /** Eigene Reservierungen laden (erfordert Login) */
  getMyReservations: async (): Promise<Reservation[]> => {
    return api.get<Reservation[]>("/public/me/reservations");
  },

  /** Reservierung stornieren (erfordert Login) */
  cancel: async (reservationId: string): Promise<Reservation> => {
    return api.post<Reservation>(`/public/me/reservations/${reservationId}/cancel`);
  },

  /** Einzelne Reservierung laden (erfordert Login) */
  getById: async (reservationId: string): Promise<Reservation> => {
    return api.get<Reservation>(`/public/me/reservations/${reservationId}`);
  },
};
