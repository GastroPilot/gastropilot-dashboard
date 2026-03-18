"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { useMyReservations, useCancelReservation } from "@/lib/hooks/use-reservations";
import { formatDateOnly } from "@/lib/utils";
import { CalendarDays, Clock, Users, MapPin, X, History } from "lucide-react";
import { toast } from "sonner";
import type { Reservation } from "@/lib/api/reservations";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Ausstehend", variant: "outline" },
  confirmed: { label: "Bestätigt", variant: "default" },
  completed: { label: "Abgeschlossen", variant: "secondary" },
  cancelled: { label: "Storniert", variant: "destructive" },
  canceled: { label: "Storniert", variant: "destructive" },
  no_show: { label: "Nicht erschienen", variant: "destructive" },
};

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const cancelMutation = useCancelReservation();
  const status = STATUS_MAP[reservation.status];
  const isUpcoming = reservation.status === "pending" || reservation.status === "confirmed";

  const handleCancel = async () => {
    if (confirm("Möchten Sie diese Reservierung wirklich stornieren?")) {
      try {
        await cancelMutation.mutateAsync(reservation.id);
        toast.success("Reservierung wurde storniert");
      } catch {
        toast.error("Fehler beim Stornieren der Reservierung");
      }
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/reservations/${reservation.id}`}
                className="text-lg font-semibold hover:text-primary hover:underline"
              >
                {reservation.restaurant_name}
              </Link>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {formatDateOnly(reservation.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {reservation.time} Uhr
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {reservation.party_size} {reservation.party_size === 1 ? "Person" : "Personen"}
              </span>
            </div>
            {reservation.special_requests && (
              <p className="text-sm text-muted-foreground">
                Wünsche: {reservation.special_requests}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Bestätigungscode: <span className="font-mono">{reservation.confirmation_code}</span>
            </p>
          </div>

          {isUpcoming && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <X className="mr-1 h-4 w-4" />
              {cancelMutation.isPending ? "Wird storniert..." : "Stornieren"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReservationsPage() {
  const { data: reservations, isLoading } = useMyReservations();

  const upcoming = reservations?.filter(
    (r) => r.status === "pending" || r.status === "confirmed"
  ) ?? [];
  const past = reservations?.filter(
    (r) => r.status === "completed" || r.status === "cancelled" || r.status === "canceled" || r.status === "no_show"
  ) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Meine Reservierungen</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Bevorstehende Reservierungen</h2>
            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p>Keine bevorstehenden Reservierungen.</p>
                  <Link href="/restaurants">
                    <Button className="mt-4">Restaurant finden</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcoming.map((r) => (
                  <ReservationCard key={r.id} reservation={r} />
                ))}
              </div>
            )}
          </section>

          <Separator className="mb-8" />

          {/* Past */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Vergangene Reservierungen</h2>
            {past.length === 0 ? (
              <EmptyState
                icon={History}
                title="Keine vergangenen Reservierungen"
                description="Hier erscheinen Ihre abgeschlossenen Reservierungen."
              />
            ) : (
              <div className="space-y-4">
                {past.map((r) => (
                  <ReservationCard key={r.id} reservation={r} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
