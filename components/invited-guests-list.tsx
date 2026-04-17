"use client";

import { Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { useReservationInvites } from "@/lib/hooks/queries/use-guest-invites";

const ALLERGEN_LABELS: Record<string, string> = {
  gluten: "Gluten",
  crustaceans: "Krebstiere",
  eggs: "Eier",
  fish: "Fisch",
  peanuts: "Erdnüsse",
  soy: "Soja",
  milk: "Milch",
  nuts: "Schalenfrüchte",
  celery: "Sellerie",
  mustard: "Senf",
  sesame: "Sesam",
  sulfites: "Sulfite",
  lupin: "Lupine",
  molluscs: "Weichtiere",
};

interface Props {
  reservationId: string;
  partySize: number;
}

export function InvitedGuestsList({ reservationId, partySize }: Props) {
  const { data: invites, isLoading } = useReservationInvites(reservationId);

  if (partySize <= 1) return null;
  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        <p className="text-xs font-medium text-muted-foreground">Eingeladene Gäste</p>
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }
  if (!invites || invites.length === 0) return null;

  const acceptedCount = invites.filter((i) => i.status === "accepted").length;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Eingeladene Gäste
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {acceptedCount}/{invites.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
          >
            {invite.status === "accepted" ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : invite.status === "declined" ? (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            ) : (
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            )}

            <div className="min-w-0 flex-1">
              {invite.invited_guest ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs font-medium">
                    {invite.invited_guest.first_name} {invite.invited_guest.last_name}
                  </span>
                  {invite.invited_guest.allergen_ids.map((id) => (
                    <span
                      key={id}
                      className="inline-flex rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      {ALLERGEN_LABELS[id] || id}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic text-muted-foreground">
                  {invite.status === "declined" ? "Abgesagt" : "Ausstehend"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
