"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReservation, useCancelReservation } from "@/lib/hooks/use-reservations";
import { formatDateOnly } from "@/lib/utils";
import { QrCodeCard } from "@/components/qr-code-card";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Mail,
  Phone,
  Hash,
  MessageSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Ausstehend", variant: "outline" },
  confirmed: { label: "Bestätigt", variant: "default" },
  completed: { label: "Abgeschlossen", variant: "secondary" },
  cancelled: { label: "Storniert", variant: "destructive" },
  canceled: { label: "Storniert", variant: "destructive" },
  no_show: { label: "Nicht erschienen", variant: "destructive" },
};

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;
  const { data: reservation, isLoading } = useReservation(reservationId);
  const cancelMutation = useCancelReservation();

  const handleCancel = async () => {
    if (confirm("Möchten Sie diese Reservierung wirklich stornieren?")) {
      try {
        await cancelMutation.mutateAsync(reservationId);
        toast.success("Reservierung wurde storniert");
        router.push("/reservations");
      } catch {
        toast.error("Fehler beim Stornieren der Reservierung");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-6 h-8 w-64" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
        Reservierung nicht gefunden.
      </div>
    );
  }

  const status = STATUS_MAP[reservation.status];
  const isUpcoming = reservation.status === "pending" || reservation.status === "confirmed";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={() => router.push("/reservations")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Reservierungen
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservierung</h1>
        <Badge variant={status?.variant || "secondary"}>{status?.label || reservation.status}</Badge>
      </div>

      <div className="space-y-4">
        {/* Restaurant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <Link
                href={`/restaurants/${reservation.restaurant_slug}`}
                className="hover:text-primary hover:underline"
              >
                {reservation.restaurant_name}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{formatDateOnly(reservation.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.time} Uhr</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.party_size} {reservation.party_size === 1 ? "Person" : "Personen"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{reservation.confirmation_code}</span>
              </div>
            </div>

            {reservation.guest_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {reservation.guest_name}
              </div>
            )}
            {reservation.guest_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {reservation.guest_email}
              </div>
            )}
            {reservation.guest_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {reservation.guest_phone}
              </div>
            )}

            {reservation.special_requests && (
              <div className="rounded-md border p-3">
                <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  Sonderwünsche
                </div>
                <p className="text-sm">{reservation.special_requests}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isUpcoming && reservation.confirmation_code && (
          <QrCodeCard
            confirmationCode={reservation.confirmation_code}
            restaurantSlug={reservation.restaurant_slug}
          />
        )}

        {isUpcoming && (
          <Button
            variant="outline"
            className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            {cancelMutation.isPending ? "Wird storniert..." : "Reservierung stornieren"}
          </Button>
        )}
      </div>
    </div>
  );
}
