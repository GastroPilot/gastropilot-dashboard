"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AllergenFilter } from "@/components/allergen-filter";
import { useAuth } from "@/lib/hooks/use-auth";
import type { AllergenId } from "@/lib/utils";
import { Check } from "lucide-react";

export default function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [allergenIds, setAllergenIds] = useState<AllergenId[]>([]);
  const [success, setSuccess] = useState(false);

  const handleAllergenToggle = (id: AllergenId) => {
    setAllergenIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone: phone || undefined,
        allergen_ids: allergenIds.length ? allergenIds : undefined,
      });
      setSuccess(true);
    } catch {
      // Error is set in the store
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-green-500/50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Registrierung erfolgreich!</h2>
            <p className="text-sm text-muted-foreground">
              Bitte bestätigen Sie Ihre E-Mail-Adresse. Wir haben Ihnen eine
              Bestätigungs-Mail an <strong>{email}</strong> gesendet.
            </p>
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Registrieren</CardTitle>
          <CardDescription>
            Erstellen Sie ein kostenloses Konto
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">E-Mail *</Label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Passwort *</Label>
              <Input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Telefon (optional)</Label>
              <Input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 ..."
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>Allergenprofil (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Wählen Sie Ihre Allergien aus, um personalisierte Empfehlungen zu erhalten.
              </p>
              <AllergenFilter
                selectedAllergens={allergenIds}
                onToggle={handleAllergenToggle}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Wird registriert..." : "Konto erstellen"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Bereits ein Konto?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Anmelden
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
