import { useQuery } from "@tanstack/react-query";
import { guestInvitesApi } from "@/lib/api/guest-invites";

export const guestInviteKeys = {
  all: ["guest-invites"] as const,
  list: (reservationId: string) =>
    [...guestInviteKeys.all, "list", reservationId] as const,
};

export function useReservationInvites(reservationId: string | undefined) {
  return useQuery({
    queryKey: guestInviteKeys.list(reservationId!),
    queryFn: () => guestInvitesApi.list(reservationId!),
    enabled: !!reservationId,
    staleTime: 30_000,
  });
}
