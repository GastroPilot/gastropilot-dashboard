"use client";

import { useEffect, useState, useCallback } from "react";
import { billingApi, type SubscriptionPlan, type Subscription } from "@/lib/api/billing";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Check, CreditCard, ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function BillingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);

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

  useEffect(() => {
    async function load() {
      try {
        const [plansData, subData] = await Promise.all([
          billingApi.getPlans(),
          billingApi.getSubscription(),
        ]);
        setPlans(plansData);
        setSubscription(subData);
      } catch (err) {
        console.error("Fehler beim Laden der Billing-Daten:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (searchParams?.get("success") === "true") {
      addToast("Abonnement erfolgreich abgeschlossen!", "success");
    }
    if (searchParams?.get("canceled") === "true") {
      addToast("Checkout abgebrochen", "info");
    }
  }, [searchParams, addToast]);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { checkout_url } = await billingApi.createCheckout(planId);
      window.location.href = checkout_url;
    } catch (err) {
      console.error("Fehler beim Erstellen des Checkouts:", err);
      addToast("Fehler beim Erstellen des Checkouts", "error");
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const { url } = await billingApi.openPortal();
      window.location.href = url;
    } catch (err) {
      console.error("Fehler beim Öffnen des Portals:", err);
      addToast("Fehler beim Öffnen des Billing-Portals", "error");
    }
  };

  if (isLoading) return <LoadingOverlay />;

  const currentTier = subscription?.plan || "free";
  const isActive = subscription?.status === "active";

  const tierOrder = ["free", "starter", "professional", "enterprise"];

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Abonnement</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Verwalten Sie Ihren Plan und Ihre Abrechnung
              </p>
            </div>
          </div>
          {isActive && subscription?.plan !== "free" && (
            <Button variant="outline" size="sm" onClick={handlePortal} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Billing verwalten
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Aktueller Plan */}
        {subscription && (
          <div className="mb-8 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktueller Plan</p>
                <p className="text-xl font-bold text-foreground capitalize">
                  {currentTier}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {isActive ? "Aktiv" : subscription.status}
                </span>
              </div>
            </div>
            {subscription.current_period_end && (
              <p className="text-xs text-muted-foreground mt-2">
                Naechste Abrechnung:{" "}
                {new Date(subscription.current_period_end).toLocaleDateString("de-DE")}
              </p>
            )}
          </div>
        )}

        {/* Plan-Vergleich */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const isUpgrade =
              tierOrder.indexOf(plan.id) > tierOrder.indexOf(currentTier);
            const isDowngrade =
              tierOrder.indexOf(plan.id) < tierOrder.indexOf(currentTier);

            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-5 flex flex-col ${
                  isCurrent
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price === 0
                        ? "Kostenlos"
                        : `€${plan.price.toFixed(0)}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-sm">/Monat</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Aktueller Plan
                  </Button>
                ) : plan.id === "free" ? (
                  <Button variant="outline" disabled={isDowngrade} className="w-full">
                    {isDowngrade ? "Downgrade" : "Kostenlos starten"}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white dark:text-foreground"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading === plan.id || isDowngrade}
                  >
                    {checkoutLoading === plan.id
                      ? "Wird geladen..."
                      : isUpgrade
                      ? "Upgrade"
                      : "Auswählen"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg border ${
                toast.variant === "error"
                  ? "bg-red-900/90 border-red-600 text-red-100"
                  : toast.variant === "success"
                  ? "bg-green-900/90 border-green-600 text-green-100"
                  : "bg-blue-900/90 border-blue-600 text-blue-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
