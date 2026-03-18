"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AllergenFilter } from "@/components/allergen-filter";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/hooks/use-auth";
import { profileApi } from "@/lib/api/profile";
import { cn, type AllergenId } from "@/lib/utils";
import { User, ShieldCheck, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, loadUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [allergenIds, setAllergenIds] = useState<AllergenId[]>([]);

  const [saving, setSaving] = useState(false);
  const [savingAllergens, setSavingAllergens] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setPhone(user.phone || "");
      setAllergenIds((user.allergen_ids || (user as any).allergen_profile || []) as AllergenId[]);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      });
      await loadUser();
      toast.success("Profil erfolgreich aktualisiert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const handleAllergenToggle = (id: AllergenId) => {
    setAllergenIds((prev) => {
      const list = prev ?? [];
      return list.includes(id) ? list.filter((a) => a !== id) : [...list, id];
    });
  };

  const handleSaveAllergens = async () => {
    setSavingAllergens(true);
    try {
      await profileApi.updateAllergenProfile({ allergen_ids: allergenIds });
      await loadUser();
      toast.success("Allergenprofil aktualisiert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingAllergens(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Mein Profil</h1>

      {user?.email_verified === false && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Ihre E-Mail-Adresse ist noch nicht verifiziert. Bitte prüfen Sie Ihr Postfach.
        </div>
      )}

      {!user ? (
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
        </div>
      ) : (
      <>
      {/* Profile Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Persönliche Daten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-first">Vorname</Label>
                <Input
                  id="profile-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-last">Nachname</Label>
                <Input
                  id="profile-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">E-Mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Die E-Mail-Adresse kann nicht geändert werden.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Telefon</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 ..."
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Allergen Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Allergenprofil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wählen Sie Ihre Allergien aus, um bei der Restaurantsuche und Speisekarte
            automatisch gewarnt zu werden.
          </p>
          <AllergenFilter
            selectedAllergens={allergenIds}
            onToggle={handleAllergenToggle}
          />
          <Separator />
          <Button onClick={handleSaveAllergens} disabled={savingAllergens}>
            <Save className="mr-2 h-4 w-4" />
            {savingAllergens ? "Wird gespeichert..." : "Allergenprofil speichern"}
          </Button>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
