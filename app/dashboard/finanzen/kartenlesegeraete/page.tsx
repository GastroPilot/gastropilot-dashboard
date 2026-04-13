"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { restaurantsApi } from "@/lib/api/restaurants";
import {
  createReader,
  getFailedPayments,
  getPayments,
  getReaderStatus,
  listReaders,
  type SumUpPayment,
  type SumUpReader,
  type SumUpReaderStatus,
} from "@/lib/api/sumup";

type ReaderState = {
  reader: SumUpReader;
  status: SumUpReaderStatus | null;
  statusError: string | null;
};

type Feedback = {
  variant: "success" | "error" | "info";
  message: string;
} | null;

const DASHBOARD_CARD_HOVER_CLASS =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";
const DASHBOARD_CARD_SURFACE_CLASS =
  "relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";
const DASHBOARD_ROW_HOVER_CLASS =
  "transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-accent/60";

function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapReaderBadge(status: SumUpReader["status"]): { label: string; className: string } {
  if (status === "paired") {
    return { label: "Gekoppelt", className: "bg-emerald-500/15 text-emerald-300" };
  }
  if (status === "processing") {
    return { label: "Verarbeitung", className: "bg-blue-500/15 text-blue-300" };
  }
  if (status === "expired") {
    return { label: "Abgelaufen", className: "bg-amber-500/15 text-amber-300" };
  }
  return { label: "Unbekannt", className: "bg-muted text-muted-foreground" };
}

function mapConnectionBadge(status: SumUpReaderStatus | null): { label: string; className: string } {
  if (!status) {
    return { label: "Nicht verfügbar", className: "bg-muted text-muted-foreground" };
  }
  if (status.status === "ONLINE") {
    return { label: "Online", className: "bg-emerald-500/15 text-emerald-300" };
  }
  return { label: "Offline", className: "bg-red-500/15 text-red-300" };
}

export default function FinanceCardReadersPage() {
  const [pairingCode, setPairingCode] = useState("");
  const [readerName, setReaderName] = useState("");
  const [readerLocation, setReaderLocation] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const restaurantQuery = useQuery({
    queryKey: ["finance", "card-readers", "restaurant"],
    queryFn: async () => {
      const restaurants = await restaurantsApi.list();
      return restaurants[0] ?? null;
    },
    staleTime: 60 * 1000,
  });

  const restaurant = restaurantQuery.data;
  const restaurantId = restaurant?.id ?? null;
  const sumupEnabled = Boolean(restaurant?.sumup_enabled);

  const readersQuery = useQuery({
    queryKey: ["finance", "card-readers", "list", restaurantId],
    enabled: Boolean(restaurantId) && sumupEnabled,
    queryFn: async (): Promise<SumUpReader[]> => listReaders(restaurantId!),
    refetchInterval: 30 * 1000,
  });

  const readerStatesQuery = useQuery({
    queryKey: [
      "finance",
      "card-readers",
      "status",
      restaurantId,
      (readersQuery.data ?? []).map((reader) => reader.id).join(","),
    ],
    enabled: Boolean(restaurantId) && sumupEnabled && (readersQuery.data?.length ?? 0) > 0,
    queryFn: async (): Promise<ReaderState[]> => {
      const readers = readersQuery.data ?? [];
      const states = await Promise.all(
        readers.map(async (reader) => {
          try {
            const status = await getReaderStatus(restaurantId!, reader.id);
            return {
              reader,
              status,
              statusError: null,
            } satisfies ReaderState;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Status konnte nicht geladen werden";
            return {
              reader,
              status: null,
              statusError: message,
            } satisfies ReaderState;
          }
        })
      );
      return states;
    },
    refetchInterval: 30 * 1000,
  });

  const paymentsQuery = useQuery({
    queryKey: ["finance", "card-readers", "payments", restaurantId],
    enabled: Boolean(restaurantId) && sumupEnabled,
    queryFn: async (): Promise<SumUpPayment[]> => getPayments(restaurantId!, undefined, 40),
    refetchInterval: 30 * 1000,
  });

  const failedPaymentsQuery = useQuery({
    queryKey: ["finance", "card-readers", "failed-payments", restaurantId],
    enabled: Boolean(restaurantId) && sumupEnabled,
    queryFn: async (): Promise<SumUpPayment[]> => getFailedPayments(restaurantId!, 20),
    refetchInterval: 30 * 1000,
  });

  const createReaderMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) {
        throw new Error("Kein Restaurant ausgewählt.");
      }
      const metadata = readerLocation.trim() ? { location: readerLocation.trim() } : undefined;
      return createReader(restaurantId, pairingCode.trim(), readerName.trim(), metadata);
    },
    onSuccess: async () => {
      setFeedback({ variant: "success", message: "Kartenlesegerät erfolgreich gekoppelt." });
      setPairingCode("");
      setReaderName("");
      setReaderLocation("");
      await Promise.all([
        readersQuery.refetch(),
        readerStatesQuery.refetch(),
        paymentsQuery.refetch(),
        failedPaymentsQuery.refetch(),
      ]);
    },
    onError: (error) => {
      setFeedback({
        variant: "error",
        message: error instanceof Error ? error.message : "Koppeln fehlgeschlagen.",
      });
    },
  });

  const readers = useMemo(() => readersQuery.data ?? [], [readersQuery.data]);
  const readerStates = useMemo(() => readerStatesQuery.data ?? [], [readerStatesQuery.data]);
  const displayReaderStates: ReaderState[] =
    readerStates.length > 0
      ? readerStates
      : readers.map((reader) => ({ reader, status: null, statusError: null }));
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const failedPayments = useMemo(
    () => failedPaymentsQuery.data ?? [],
    [failedPaymentsQuery.data]
  );

  const isLoading =
    restaurantQuery.isLoading ||
    readersQuery.isLoading ||
    paymentsQuery.isLoading ||
    failedPaymentsQuery.isLoading ||
    readerStatesQuery.isLoading;

  const isRefreshing =
    restaurantQuery.isFetching ||
    readersQuery.isFetching ||
    paymentsQuery.isFetching ||
    failedPaymentsQuery.isFetching ||
    readerStatesQuery.isFetching;

  const summary = useMemo(() => {
    const online = displayReaderStates.filter((entry) => entry.status?.status === "ONLINE").length;
    const paired = readers.filter((reader) => reader.status === "paired").length;
    const offline = Math.max(0, displayReaderStates.length - online);

    const paymentCounts = payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.status] = (acc[payment.status] ?? 0) + 1;
      return acc;
    }, {});

    const successfulRevenue = payments
      .filter((payment) => payment.status === "successful")
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    return {
      totalReaders: readers.length,
      pairedReaders: paired,
      onlineReaders: online,
      offlineReaders: offline,
      successfulRevenue,
      failedPaymentCount: failedPayments.length,
      pendingPayments: (paymentCounts.pending ?? 0) + (paymentCounts.processing ?? 0),
    };
  }, [displayReaderStates, failedPayments.length, payments, readers]);

  const refreshAll = async () => {
    setFeedback(null);
    await Promise.all([
      restaurantQuery.refetch(),
      readersQuery.refetch(),
      readerStatesQuery.refetch(),
      paymentsQuery.refetch(),
      failedPaymentsQuery.refetch(),
    ]);
  };

  const queryError =
    (restaurantQuery.error as Error | null) ||
    (readersQuery.error as Error | null) ||
    (paymentsQuery.error as Error | null) ||
    (failedPaymentsQuery.error as Error | null) ||
    null;

  return (
    <FinanceModuleLayout
      title="Kartenlesegeräte"
      description="Reader-Verwaltung, Live-Status und Zahlungsverlauf aus der SumUp-Integration."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={refreshAll} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      }
    >
      <div className="space-y-6">
        {feedback ? (
          <Card
            className={
              feedback.variant === "success"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : feedback.variant === "error"
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-blue-500/40 bg-blue-500/10"
            }
          >
            <CardContent className="pt-4 text-sm">{feedback.message}</CardContent>
          </Card>
        ) : null}

        {queryError ? (
          <Card className="border-red-500/40 bg-red-500/10">
            <CardContent className="pt-4 text-sm text-red-200">
              Daten konnten nicht geladen werden: {queryError.message}
            </CardContent>
          </Card>
        ) : null}

        {!sumupEnabled ? (
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-base">SumUp ist nicht aktiviert</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-100">
              Für das aktuelle Restaurant ist die Kartenlesegeräte-Integration deaktiviert.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reader gesamt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalReaders}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.pairedReaders} gekoppelt</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reader-Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.onlineReaders}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.offlineReaders} offline / unbekannt</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Erfolgreiche Kartenzahlungen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.successfulRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">aus den letzten {payments.length} Zahlungen</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Probleme</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.failedPaymentCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.pendingPayments} Zahlungen in Bearbeitung</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <Card className={`xl:col-span-2 ${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Kartenlesegeräte</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lade Reader...
                </div>
              ) : readers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine Reader vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {displayReaderStates.map((entry) => {
                    const readerBadge = mapReaderBadge(entry.reader.status);
                    const connectionBadge = mapConnectionBadge(entry.status);
                    return (
                      <div
                        key={entry.reader.id}
                        className={`rounded-md border border-border/70 bg-background/40 p-3 ${DASHBOARD_ROW_HOVER_CLASS}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{entry.reader.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{entry.reader.id}</p>
                            <p className="text-xs text-muted-foreground">
                              Modell: {entry.reader.device.model} | Identifier: {entry.reader.device.identifier}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs ${readerBadge.className}`}>
                              {readerBadge.label}
                            </span>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs ${connectionBadge.className}`}>
                              {connectionBadge.label}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                          <div className="rounded border border-border/60 bg-card/50 px-2 py-1.5">
                            <p className="text-muted-foreground">Batterie</p>
                            <p className="text-foreground font-medium">
                              {entry.status?.battery_level != null ? `${Math.round(entry.status.battery_level)}%` : "-"}
                            </p>
                          </div>
                          <div className="rounded border border-border/60 bg-card/50 px-2 py-1.5">
                            <p className="text-muted-foreground">Firmware</p>
                            <p className="text-foreground font-medium">{entry.status?.firmware_version ?? "-"}</p>
                          </div>
                          <div className="rounded border border-border/60 bg-card/50 px-2 py-1.5">
                            <p className="text-muted-foreground">Reader State</p>
                            <p className="text-foreground font-medium">{entry.status?.state ?? "-"}</p>
                          </div>
                          <div className="rounded border border-border/60 bg-card/50 px-2 py-1.5">
                            <p className="text-muted-foreground">Letzte Aktivität</p>
                            <p className="text-foreground font-medium">{formatDate(entry.status?.last_activity)}</p>
                          </div>
                        </div>

                        {entry.statusError ? (
                          <p className="mt-2 text-xs text-amber-300">Statusfehler: {entry.statusError}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Reader koppeln</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Pairing Code</label>
                <Input
                  value={pairingCode}
                  onChange={(event) => setPairingCode(event.target.value)}
                  placeholder="z. B. 1234-5678"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Reader Name</label>
                <Input
                  value={readerName}
                  onChange={(event) => setReaderName(event.target.value)}
                  placeholder="Tresen Terminal"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Standort (optional)</label>
                <Input
                  value={readerLocation}
                  onChange={(event) => setReaderLocation(event.target.value)}
                  placeholder="Bar / Kasse 1"
                />
              </div>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={
                  !restaurantId ||
                  !sumupEnabled ||
                  createReaderMutation.isPending ||
                  pairingCode.trim().length < 4 ||
                  readerName.trim().length < 2
                }
                onClick={() => createReaderMutation.mutate()}
              >
                {createReaderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Reader koppeln
              </Button>
              <p className="text-xs text-muted-foreground">
                Nach erfolgreichem Pairing wird der Reader automatisch in der Liste aktualisiert.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base">Letzte Kartenzahlungen</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Zahlungen vorhanden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="text-left border-b border-border text-muted-foreground">
                      <th className="py-2 pr-3">Zeitpunkt</th>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Reader</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Betrag</th>
                      <th className="py-2 pr-3">Checkout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const statusTone =
                        payment.status === "successful"
                          ? "text-emerald-300"
                          : payment.status === "failed" || payment.status === "canceled"
                            ? "text-red-300"
                            : "text-amber-300";
                      return (
                        <tr key={payment.id} className={`border-b border-border/60 align-top ${DASHBOARD_ROW_HOVER_CLASS}`}>
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDate(payment.initiated_at)}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{payment.order_id.slice(0, 8)}...</td>
                          <td className="py-2 pr-3 font-mono text-xs">{payment.reader_id ?? "-"}</td>
                          <td className={`py-2 pr-3 ${statusTone}`}>{payment.status}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{formatCurrency(payment.amount, payment.currency)}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{payment.checkout_id ?? "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FinanceModuleLayout>
  );
}
