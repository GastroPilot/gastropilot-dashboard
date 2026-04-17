import { api } from "./client";

export interface InvitedGuestProfile {
  first_name: string;
  last_name: string;
  allergen_ids: string[];
}

export interface GuestInvite {
  id: string;
  reservation_id: string;
  invite_token: string;
  status: "pending" | "accepted" | "declined";
  invited_guest: InvitedGuestProfile | null;
  created_at: string;
  updated_at: string;
}

export const guestInvitesApi = {
  /** Alle Einladungen einer Reservierung (Staff-Endpoint mit RLS) */
  list: async (reservationId: string): Promise<GuestInvite[]> => {
    return api.get(`/reservations/${reservationId}/invites`);
  },
};
