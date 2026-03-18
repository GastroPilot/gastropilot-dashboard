"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAvailability, useCreateReservation } from "@/lib/hooks/use-reservations";
import { useRestaurant } from "@/lib/hooks/use-restaurants";
import { useAuth } from "@/lib/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, Users, User, Check, ArrowLeft, ArrowRight } from "lucide-react";
import type { TimeSlot } from "@/lib/api/reservations";

type Step = "date" | "time" | "info" | "confirm";

const STEPS: { key: Step; label: string }[] = [
  { key: "date", label: "Datum & Gäste" },
  { key: "time", label: "Uhrzeit" },
  { key: "info", label: "Ihre Daten" },
  { key: "confirm", label: "Bestätigung" },
];

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant, isLoading: loadingRestaurant } = useRestaurant(slug);
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");

  // Felder aus User-Profil vorausfüllen (einmalig wenn user geladen wird)
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
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const handleSubmit = async () => {
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
      setStep("confirm");
    } catch {
      // Error handled by mutation state
    }
  };

  if (loadingRestaurant) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/restaurants/${slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {restaurant?.name || "Restaurant"}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">
        Tisch reservieren {restaurant?.name ? `bei ${restaurant.name}` : ""}
      </h1>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                i <= currentStepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < currentStepIndex ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn("hidden text-sm sm:inline", i <= currentStepIndex ? "font-medium" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border sm:w-8" />}
          </div>
        ))}
      </div>

      {/* Step: Date & Party Size */}
      {step === "date" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Datum und Gästezahl wählen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="book-date">Datum</Label>
              <Input
                id="book-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-party">Personenzahl</Label>
              <select
                id="book-party"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length: restaurant?.booking_max_party_size || 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Person" : "Personen"}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              disabled={!date}
              onClick={() => setStep("time")}
            >
              Weiter <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Time Selection */}
      {step === "time" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Uhrzeit wählen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableSlots.map((slot: TimeSlot) => (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTime(slot.time)}
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
            ) : (
              <p className="py-4 text-center text-muted-foreground">
                Keine verfügbaren Zeiten für dieses Datum.
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("date")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedTime}
                onClick={() => setStep("info")}
              >
                Weiter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Guest Info */}
      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ihre Daten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="info-name">Name *</Label>
              <Input
                id="info-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Vor- und Nachname"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-email">E-Mail *</Label>
              <Input
                id="info-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-phone">Telefon</Label>
              <Input
                id="info-phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+49 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-requests">Besondere Wünsche</Label>
              <textarea
                id="info-requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="z.B. Allergien, Kinderstuhl, ..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {createReservation.error && (
              <p className="text-sm text-destructive">
                {createReservation.error instanceof Error
                  ? createReservation.error.message
                  : "Reservierung fehlgeschlagen."}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("time")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Zurueck
              </Button>
              <Button
                className="flex-1"
                disabled={!guestName || !guestEmail || createReservation.isPending}
                onClick={handleSubmit}
              >
                {createReservation.isPending ? "Wird gebucht..." : "Jetzt reservieren"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Confirmation */}
      {step === "confirm" && (
        <Card className="border-green-500/50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Reservierung bestätigt!</h2>
            <p className="text-muted-foreground">
              Ihre Reservierung wurde erfolgreich erstellt.
            </p>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p><strong>Restaurant:</strong> {restaurant?.name}</p>
              <p><strong>Datum:</strong> {new Date(date).toLocaleDateString("de-DE")}</p>
              <p><strong>Uhrzeit:</strong> {selectedTime} Uhr</p>
              <p><strong>Personen:</strong> {partySize}</p>
              {confirmationCode && (
                <p className="mt-2">
                  <strong>Bestätigungscode:</strong>{" "}
                  <span className="font-mono">{confirmationCode}</span>
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Sie erhalten in Kürze eine Bestätigungs-Mail an {guestEmail}.
            </p>
            <div className="flex gap-2">
              <Link href={`/restaurants/${slug}`}>
                <Button variant="outline">Zum Restaurant</Button>
              </Link>
              <Link href="/restaurants">
                <Button>Weitere Restaurants</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
