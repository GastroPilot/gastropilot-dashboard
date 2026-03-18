"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAvailability, useCreateReservation } from "@/lib/hooks/use-reservations";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, Users, Check, ExternalLink } from "lucide-react";
import type { TimeSlot } from "@/lib/api/reservations";

interface BookingWidgetProps {
  slug: string;
  maxPartySize?: number;
  className?: string;
}

export function BookingWidget({ slug, maxPartySize = 12, className }: BookingWidgetProps) {
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  // Guest info form
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Felder aus User-Profil vorausfüllen
  const prefilled = useRef(false);
  useEffect(() => {
    if (user && !prefilled.current) {
      const name = `${user.first_name} ${user.last_name}`.trim();
      if (name) setGuestName(name);
      if (user.email) setGuestEmail(user.email);
      if (user.phone) setGuestPhone(user.phone);
      prefilled.current = true;
    }
  }, [user]);

  const { data: availability, isLoading: loadingSlots } = useAvailability(slug, date, partySize);
  const createReservation = useCreateReservation(slug);

  const availableSlots = availability?.slots?.filter((s: TimeSlot) => s.available) ?? [];

  const handleCheckAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    // Availability query is triggered automatically by useAvailability
    setSelectedTime(null);
    setShowForm(false);
    setSuccess(false);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !date) return;

    try {
      const result = await createReservation.mutateAsync({
        date,
        time: selectedTime,
        party_size: partySize,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || undefined,
        special_requests: specialRequests || undefined,
      });
      setConfirmationCode(result.confirmation_code);
      setSuccess(true);
    } catch {
      // Error is handled by mutation state
    }
  };

  if (success) {
    return (
      <Card className={cn("border-green-500/50", className)}>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">Reservierung bestätigt!</h3>
          <p className="text-sm text-muted-foreground">
            Ihre Reservierung wurde erfolgreich erstellt. Sie erhalten in Kürze eine Bestätigungs-Mail.
          </p>
          {confirmationCode && (
            <p className="text-sm">
              Bestätigungscode: <span className="font-mono font-bold">{confirmationCode}</span>
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setSuccess(false);
              setShowForm(false);
              setSelectedTime(null);
              setDate("");
            }}
          >
            Neue Reservierung
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Tisch reservieren</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Party Size */}
        <form onSubmit={handleCheckAvailability} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-date" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Datum
            </Label>
            <Input
              id="booking-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedTime(null);
                setShowForm(false);
              }}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-party-size" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Personenzahl
            </Label>
            <select
              id="booking-party-size"
              value={partySize}
              onChange={(e) => {
                setPartySize(Number(e.target.value));
                setSelectedTime(null);
                setShowForm(false);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Array.from({ length: maxPartySize }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Person" : "Personen"}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={!date}>
            Verfügbarkeit prüfen
          </Button>
        </form>

        {/* Time Slots */}
        {date && loadingSlots && (
          <p className="text-center text-sm text-muted-foreground">Zeitfenster werden geladen...</p>
        )}

        {date && !loadingSlots && availableSlots.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Verfügbare Zeiten
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot: TimeSlot) => (
                <button
                  key={slot.time}
                  onClick={() => handleSelectTime(slot.time)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    selectedTime === slot.time
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary hover:text-primary"
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        )}

        {date && !loadingSlots && availability && availableSlots.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Leider sind für dieses Datum keine Zeitfenster verfügbar.
          </p>
        )}

        {/* Guest Info Form */}
        {showForm && selectedTime && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Ihre Daten</h4>

            <div className="space-y-2">
              <Label htmlFor="guest-name">Name *</Label>
              <Input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Vor- und Nachname"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-email">E-Mail *</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-phone">Telefon</Label>
              <Input
                id="guest-phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+49 ..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special-requests">Besondere Wuensche</Label>
              <textarea
                id="special-requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="z.B. Allergien, Kinderstuhl, ..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {createReservation.error && (
              <p className="text-sm text-destructive">
                {createReservation.error instanceof Error
                  ? createReservation.error.message
                  : "Reservierung fehlgeschlagen. Bitte versuchen Sie es erneut."}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={createReservation.isPending}
            >
              {createReservation.isPending ? "Wird gebucht..." : "Jetzt reservieren"}
            </Button>
          </form>
        )}

        <div className="border-t pt-3">
          <Link
            href={`/book/${slug}`}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Zur vollständigen Buchungsseite
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
