"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGuestsApi, adminReservationsApi } from "@/lib/api/admin";
import type { AdminReservation } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Phone,
  Globe,
  CalendarDays,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminGuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const guestId = params.id as string;

  const { data: guest, isLoading } = useQuery({
    queryKey: ["admin", "guests", guestId],
    queryFn: () => adminGuestsApi.get(guestId),
  });

  // Profil-Felder
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("");
  const [notes, setNotes] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  // Passwort
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (guest) {
      setFirstName(guest.first_name || "");
      setLastName(guest.last_name || "");
      setEmail(guest.email || "");
      setPhone(guest.phone || "");
      setLanguage(guest.language || "de");
      setNotes(guest.notes || "");
      setEmailVerified(guest.email_verified);
    }
  }, [guest]);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof adminGuestsApi.update>[1]) =>
      adminGuestsApi.update(guestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "guests"] });
      toast.success("Profil gespeichert");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminGuestsApi.delete(guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "guests"] });
      toast.success("Gast gelöscht");
      router.push("/admin/guests");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
      phone: phone || undefined,
      language: language || undefined,
      notes: notes || undefined,
      email_verified: emailVerified,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { password: newPassword },
      {
        onSuccess: () => {
          setNewPassword("");
          toast.success("Passwort gespeichert");
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm("Gast und alle zugehörigen Daten wirklich löschen?")) {
      deleteMutation.mutate();
    }
  };

  // Reservierungen dieses Gastes (über guest_email)
  const { data: reservations } = useQuery({
    queryKey: ["admin", "guest-reservations", guest?.email],
    queryFn: () => adminReservationsApi.list({ per_page: 10 }),
    enabled: !!guest?.email,
  });

  // Reservierungen nach Gast-Email filtern (client-side da kein guest_profile_id Filter im Backend)
  const guestReservations = reservations?.items.filter(
    (r: AdminReservation) => r.guest_email === guest?.email
  ) || [];

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!guest) {
    return <div className="text-muted-foreground">Gast nicht gefunden</div>;
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push("/admin/guests")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {guest.first_name} {guest.last_name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {guest.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {guest.email}
              </span>
            )}
            {guest.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {guest.phone}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={guest.email_verified ? "default" : "secondary"}>
              {guest.email_verified ? "E-Mail verifiziert" : "Nicht verifiziert"}
            </Badge>
            {guest.has_password && (
              <Badge variant="outline" className="gap-1">
                <KeyRound className="h-3 w-3" />
                Passwort gesetzt
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Löschen
        </Button>
      </div>

      <div className="space-y-6">
        {/* Profil bearbeiten */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profil bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Sprache</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">Englisch</option>
                    <option value="fr">Französisch</option>
                    <option value="it">Italienisch</option>
                    <option value="es">Spanisch</option>
                  </select>
                </div>
                <div className="flex items-end space-y-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emailVerified}
                      onChange={(e) => setEmailVerified(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="flex items-center gap-1 text-sm">
                      <Shield className="h-3.5 w-3.5" />
                      E-Mail verifiziert
                    </span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                  placeholder="Interne Notizen zum Gast..."
                />
              </div>

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Speichern..." : "Profil speichern"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Passwort ändern */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5" />
              Passwort {guest.has_password ? "ändern" : "setzen"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {guest.has_password
                    ? "Das bestehende Passwort wird überschrieben."
                    : "Der Gast hat noch kein Passwort. Nach dem Setzen kann er sich damit anmelden."}
                </p>
              </div>

              <Button type="submit" variant="outline" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Speichern..." : "Passwort speichern"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Reservierungen */}
        {guestReservations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Reservierungen ({guestReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {guestReservations.map((r: AdminReservation) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">{r.restaurant_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {r.start_at
                          ? new Date(r.start_at).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}{" "}
                        · {r.party_size} Personen
                      </div>
                    </div>
                    <Badge
                      variant={
                        r.status === "confirmed" || r.status === "seated"
                          ? "default"
                          : r.status === "canceled" || r.status === "no_show"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meta-Informationen */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informationen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{guest.id}</dd>
              <dt className="text-muted-foreground">Sprache</dt>
              <dd>{guest.language || "de"}</dd>
              <dt className="text-muted-foreground">Erstellt</dt>
              <dd>
                {guest.created_at
                  ? new Date(guest.created_at).toLocaleString("de-DE")
                  : "—"}
              </dd>
              <dt className="text-muted-foreground">Aktualisiert</dt>
              <dd>
                {guest.updated_at
                  ? new Date(guest.updated_at).toLocaleString("de-DE")
                  : "—"}
              </dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
