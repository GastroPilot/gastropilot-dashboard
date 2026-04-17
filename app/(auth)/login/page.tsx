"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api/auth";
import { restaurantsApi } from "@/lib/api/restaurants";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import {
  LogIn,
  Key,
  User,
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  Building2,
  ArrowLeft,
} from "lucide-react";

type LoginMode = "pin" | "password";

function normalizeTenantSlug(value: string): string {
  return value.trim().toLowerCase();
}

function LoginForm() {
  const searchParams = useSearchParams();
  const tenantSlugFromUrl = normalizeTenantSlug(searchParams.get("t") ?? "");

  const [mode, setMode] = useState<LoginMode>("pin");
  const [showTabs, setShowTabs] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  const [tenantInput, setTenantInput] = useState(tenantSlugFromUrl);
  const [activeTenantSlug, setActiveTenantSlug] = useState<string>(tenantSlugFromUrl);

  // PIN-Login
  const [operatorNumber, setOperatorNumber] = useState("");
  const [pin, setPin] = useState("");

  // Email/Passwort-Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>("GastroPilot");
  const [slugValid, setSlugValid] = useState<boolean | null>(activeTenantSlug ? null : true);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const resolveRestaurantName = useCallback(async (slug: string) => {
    if (!slug) {
      setRestaurantName("GastroPilot");
      setSlugValid(true);
      return false;
    }

    const { name, found } = await restaurantsApi.getPublicName(slug);
    setRestaurantName(name);
    setSlugValid(found);
    return found;
  }, []);

  useEffect(() => {
    if (!activeTenantSlug) {
      setRestaurantName("GastroPilot");
      setSlugValid(true);
      return;
    }

    resolveRestaurantName(activeTenantSlug);
  }, [activeTenantSlug, resolveRestaurantName]);

  const handleModeChange = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
  };

  const handleLogoClick = () => {
    const next = logoClickCount + 1;
    if (next >= 5) {
      setShowTabs(true);
      setMode("password");
      setLogoClickCount(0);
    } else {
      setLogoClickCount(next);
    }
  };

  const handleOperatorNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOperatorNumber(e.target.value.replace(/\D/g, "").slice(0, 4));
    setError("");
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
    setError("");
  };

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const slug = normalizeTenantSlug(tenantInput);
    if (!slug) {
      const msg = "Bitte Restaurant-Kürzel eingeben";
      setError(msg);
      addToast(msg, "error");
      return;
    }

    setLoading(true);
    const found = await resolveRestaurantName(slug);
    setLoading(false);

    if (!found) {
      const msg = "Restaurant-Kürzel nicht gefunden. Bitte prüfen und erneut versuchen.";
      setError(msg);
      addToast(msg, "error");
      return;
    }

    setActiveTenantSlug(slug);
    setTenantInput(slug);
    setMode("pin");
    setError("");
  };

  const handleBackToTenant = () => {
    setActiveTenantSlug("");
    setOperatorNumber("");
    setPin("");
    setError("");
    setSlugValid(true);
    setRestaurantName("GastroPilot");
    setMode("pin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "pin") {
      if (!activeTenantSlug) {
        const msg = "Bitte zuerst Restaurant-Kürzel eingeben";
        setError(msg);
        addToast(msg, "error");
        return;
      }
      if (operatorNumber.length !== 4) {
        const msg = "Bedienernummer muss 4 Ziffern lang sein";
        setError(msg);
        addToast(msg, "error");
        return;
      }
      if (pin.length < 6 || pin.length > 8) {
        const msg = "PIN muss 6-8 Ziffern lang sein";
        setError(msg);
        addToast(msg, "error");
        return;
      }
    } else {
      if (!email.includes("@")) {
        const msg = "Bitte eine gültige E-Mail-Adresse eingeben";
        setError(msg);
        addToast(msg, "error");
        return;
      }
      if (password.length < 6) {
        const msg = "Passwort muss mindestens 6 Zeichen lang sein";
        setError(msg);
        addToast(msg, "error");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "pin") {
        await authApi.login({ operator_number: operatorNumber, pin, tenant_slug: activeTenantSlug });
      } else {
        await authApi.login({ email, password });
      }

      const token = typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

      if (!token) {
        const msg = "Token konnte nicht gespeichert werden";
        setError(msg);
        addToast(msg, "error");
        setLoading(false);
        return;
      }

      addToast("Erfolgreich angemeldet", "success");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 300);
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof ApiError) {
        const msg = err.message || (mode === "pin"
          ? "Ungültige Bedienernummer oder PIN"
          : "Ungültige E-Mail oder Passwort");
        setError(msg);
        addToast(msg, "error");
      } else {
        const msg = "Ein Fehler ist aufgetreten";
        setError(msg);
        addToast(msg, "error");
      }
      setLoading(false);
    }
  };

  const showTenantStep = mode === "pin" && !activeTenantSlug;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-lg text-sm ${
                toast.variant === "error"
                  ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/80 dark:border-red-500 dark:text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-card border-border text-foreground"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center mb-4 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {restaurantName}
          </h1>
          <p className="text-muted-foreground text-sm">Restaurantmanagement</p>
        </div>

        {slugValid === false && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Restaurant-Link ungültig. Bitte den Administrator kontaktieren.
          </div>
        )}

        <Card className="backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-border pb-0">
            <CardTitle className="flex items-center gap-2 text-xl mb-4">
              <LogIn className="w-5 h-5 text-primary-contrast" />
              Anmelden
            </CardTitle>

            {showTabs && (
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("pin")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    mode === "pin"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Key className="w-4 h-4" />
                  PIN
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("password")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    mode === "password"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  E-Mail
                </button>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-600/50 dark:text-red-300 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Fehler</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {showTenantStep ? (
              <form onSubmit={handleTenantSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="tenantSlug"
                    className="flex items-center gap-2 text-sm font-medium text-foreground"
                  >
                    <Building2 className="w-4 h-4 text-primary-contrast" />
                    Restaurant-Kürzel
                  </label>
                  <Input
                    id="tenantSlug"
                    type="text"
                    value={tenantInput}
                    onChange={(e) => {
                      setTenantInput(e.target.value);
                      setError("");
                    }}
                    placeholder="z. B. mein-restaurant"
                    autoFocus
                    required
                    autoComplete="off"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 touch-manipulation min-h-[48px] text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Wird geprüft...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      <span>Weiter zum Login</span>
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "pin" ? (
                  <>
                    <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          Tenant: <span className="font-medium text-foreground">{activeTenantSlug}</span>
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBackToTenant}
                        className="h-8 px-2.5"
                      >
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        Zurück
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="operatorNumber"
                        className="flex items-center gap-2 text-sm font-medium text-foreground"
                      >
                        <User className="w-4 h-4 text-primary-contrast" />
                        Bedienernummer (4 Ziffern)
                      </label>
                      <Input
                        id="operatorNumber"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        value={operatorNumber}
                        onChange={handleOperatorNumberChange}
                        placeholder="0000"
                        maxLength={4}
                        required
                        autoFocus
                        className="text-center text-2xl tracking-widest font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="pin"
                        className="flex items-center gap-2 text-sm font-medium text-foreground"
                      >
                        <Key className="w-4 h-4 text-primary-contrast" />
                        PIN (6-8 Ziffern)
                      </label>
                      <Input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]{6,8}"
                        value={pin}
                        onChange={handlePinChange}
                        placeholder="••••••"
                        maxLength={8}
                        required
                        className="text-center text-xl tracking-widest font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="flex items-center gap-2 text-sm font-medium text-foreground"
                      >
                        <Mail className="w-4 h-4 text-primary-contrast" />
                        E-Mail-Adresse
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        placeholder="E-Mail eingeben"
                        required
                        autoFocus
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="password"
                        className="flex items-center gap-2 text-sm font-medium text-foreground"
                      >
                        <Lock className="w-4 h-4 text-primary-contrast" />
                        Passwort
                      </label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        placeholder="Passwort eingeben"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 touch-manipulation min-h-[48px] text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Wird angemeldet...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Anmelden</span>
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-border">
              <Link
                href={`/login-nfc${activeTenantSlug ? `?t=${activeTenantSlug}` : ""}`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors touch-manipulation min-h-[44px]"
              >
                <CreditCard className="w-5 h-5" />
                <span>Mit NFC-Transponder anmelden</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
