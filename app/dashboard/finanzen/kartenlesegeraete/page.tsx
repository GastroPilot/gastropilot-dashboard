"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { restaurantsApi } from "@/lib/api/restaurants";
import {
  terminalsApi,
  PROVIDER_LABELS,
  type PaymentTerminal,
  type TerminalPayment,
  type TerminalProvider,
} from "@/lib/api/terminals";

const DASHBOARD_CARD_HOVER =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";
const DASHBOARD_CARD_SURFACE =
  "relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "successful":
      return { label: "Erfolgreich", className: "bg-emerald-500/15 text-emerald-300" };
    case "failed":
      return { label: "Fehlgeschlagen", className: "bg-red-500/15 text-red-300" };
    case "canceled":
      return { label: "Abgebrochen", className: "bg-muted text-muted-foreground" };
    case "processing":
      return { label: "Verarbeitung", className: "bg-blue-500/15 text-blue-300" };
    case "awaiting_confirmation":
      return { label: "Warte auf Bestätigung", className: "bg-amber-500/15 text-amber-300" };
    case "pending":
      return { label: "Ausstehend", className: "bg-amber-500/15 text-amber-300" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

export default function KartenlesegeraetePage() {
  const queryClient = useQueryClient();

  // Restaurant
  const restaurantQuery = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantsApi.list(),
  });
  const restaurantId = restaurantQuery.data?.[0]?.id ?? null;

  // Terminals
  const terminalsQuery = useQuery({
    queryKey: ["terminals"],
    queryFn: () => terminalsApi.list(),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  // Payments
  const paymentsQuery = useQuery({
    queryKey: ["terminal-payments"],
    queryFn: () => terminalsApi.listPayments(undefined, 40),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const terminals = terminalsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  // Add terminal form
  const [newProvider, setNewProvider] = useState<TerminalProvider>("manual");
  const [newName, setNewName] = useState("");
  const [newPairingCode, setNewPairingCode] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      terminalsApi.create({
        provider: newProvider,
        name: newName.trim(),
        pairing_code: newProvider === "sumup" ? newPairingCode.trim() : undefined,
        metadata: newLocation ? { location: newLocation.trim() } : undefined,
      }),
    onSuccess: () => {
      setNewName("");
      setNewPairingCode("");
      setNewLocation("");
      queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => terminalsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["terminals"] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => terminalsApi.update(id, { is_default: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["terminals"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      terminalsApi.update(id, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["terminals"] }),
  });

  // Summary
  const summary = useMemo(() => {
    const activeCount = terminals.filter((t) => t.is_active).length;
    const onlineCount = terminals.filter(
      (t) => t.live_status?.status === "ONLINE"
    ).length;
    const successPayments = payments.filter((p) => p.status === "successful");
    const successRevenue = successPayments.reduce((sum, p) => sum + p.amount, 0);
    const failedCount = payments.filter(
      (p) => p.status === "failed" || p.status === "canceled"
    ).length;
    return { activeCount, onlineCount, successRevenue, failedCount, total: terminals.length };
  }, [terminals, payments]);

  const canCreate =
    newName.trim().length >= 2 &&
    (newProvider !== "sumup" || newPairingCode.trim().length >= 4);

  return (
    <FinanceModuleLayout
      title="Kartenlesegeräte"
      description="Terminal-Verwaltung, Live-Status und Zahlungsverlauf."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["terminals"] });
            queryClient.invalidateQueries({ queryKey: ["terminal-payments"] });
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className={`${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Terminals gesamt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">{summary.activeCount} aktiv</p>
            </CardContent>
          </Card>
          <Card className={`${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Online-Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.onlineCount}</p>
              <p className="text-xs text-muted-foreground">
                von {terminals.filter((t) => t.provider === "sumup").length} SumUp-Terminals online
              </p>
            </CardContent>
          </Card>
          <Card className={`${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Kartenzahlungen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.successRevenue)}</p>
              <p className="text-xs text-muted-foreground">
                {payments.filter((p) => p.status === "successful").length} erfolgreiche Zahlungen
              </p>
            </CardContent>
          </Card>
          <Card className={`${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Probleme</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.failedCount}</p>
              <p className="text-xs text-muted-foreground">fehlgeschlagene Zahlungen</p>
            </CardContent>
          </Card>
        </div>

        {/* Terminals + Add form */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className={`xl:col-span-2 ${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
            <CardHeader>
              <CardTitle className="text-base">Terminals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {terminalsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lade Terminals...
                </div>
              ) : terminals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Noch keine Terminals eingerichtet.
                </p>
              ) : (
                terminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="rounded-lg border border-border/70 bg-background/60 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">{terminal.name}</span>
                          {terminal.is_default ? (
                            <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium">
                              Standard
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">{PROVIDER_LABELS[terminal.provider]}</span>
                          {terminal.provider_terminal_id ? (
                            <span className="font-mono">{terminal.provider_terminal_id}</span>
                          ) : null}
                          {terminal.metadata?.location ? (
                            <span>{terminal.metadata.location as string}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Live status for SumUp */}
                        {terminal.provider === "sumup" && terminal.live_status ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              terminal.live_status.status === "ONLINE"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-red-500/15 text-red-300"
                            }`}
                          >
                            {terminal.live_status.status === "ONLINE" ? (
                              <Wifi className="h-3 w-3" />
                            ) : (
                              <WifiOff className="h-3 w-3" />
                            )}
                            {terminal.live_status.status === "ONLINE" ? "Online" : "Offline"}
                          </span>
                        ) : null}
                        {terminal.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5 text-[10px] font-medium">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                            Inaktiv
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SumUp details */}
                    {terminal.provider === "sumup" && terminal.live_status ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {terminal.live_status.battery_level != null ? (
                          <div className="rounded border border-border/50 bg-muted/30 px-2 py-1">
                            <span className="text-muted-foreground">Batterie:</span>{" "}
                            {terminal.live_status.battery_level}%
                          </div>
                        ) : null}
                        {terminal.live_status.firmware_version ? (
                          <div className="rounded border border-border/50 bg-muted/30 px-2 py-1">
                            <span className="text-muted-foreground">Firmware:</span>{" "}
                            {terminal.live_status.firmware_version}
                          </div>
                        ) : null}
                        {terminal.live_status.state ? (
                          <div className="rounded border border-border/50 bg-muted/30 px-2 py-1">
                            <span className="text-muted-foreground">Status:</span>{" "}
                            {terminal.live_status.state}
                          </div>
                        ) : null}
                        {terminal.live_status.last_activity ? (
                          <div className="rounded border border-border/50 bg-muted/30 px-2 py-1">
                            <span className="text-muted-foreground">Letzte Aktivität:</span>{" "}
                            {new Date(terminal.live_status.last_activity).toLocaleString("de-DE")}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex gap-1.5 pt-1">
                      {!terminal.is_default ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => setDefaultMutation.mutate(terminal.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Als Standard
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: terminal.id,
                            active: !terminal.is_active,
                          })
                        }
                      >
                        <Power className="h-3 w-3" />
                        {terminal.is_active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-red-300"
                        onClick={() => deleteMutation.mutate(terminal.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Entfernen
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Add terminal form */}
          <Card className={`${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Terminal hinzufügen</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Typ</label>
                <div className="flex gap-2">
                  <Button
                    variant={newProvider === "manual" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewProvider("manual")}
                  >
                    Manuelles Terminal
                  </Button>
                  <Button
                    variant={newProvider === "sumup" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewProvider("sumup")}
                  >
                    SumUp
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={newProvider === "sumup" ? "SumUp Solo Tresen" : "Kartenterminal Kasse 1"}
                />
              </div>

              {newProvider === "sumup" ? (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Pairing-Code</label>
                  <Input
                    value={newPairingCode}
                    onChange={(e) => setNewPairingCode(e.target.value)}
                    placeholder="ABCD1234"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Standort (optional)</label>
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="z.B. Tresen, Terrasse, Bar"
                />
              </div>

              {newProvider === "manual" ? (
                <p className="text-xs text-muted-foreground">
                  Manuelle Terminals haben keine API-Verbindung. Zahlungen werden manuell bestätigt.
                </p>
              ) : null}

              <Button
                className="w-full gap-2"
                disabled={!canCreate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Terminal hinzufügen
              </Button>

              {createMutation.isError ? (
                <p className="text-xs text-red-300">
                  Fehler: {(createMutation.error as Error)?.message || "Unbekannt"}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Payment history */}
        <Card className={`${DASHBOARD_CARD_SURFACE} ${DASHBOARD_CARD_HOVER}`}>
          <CardHeader>
            <CardTitle className="text-base">Zahlungsverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Noch keine Kartenzahlungen.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Zeitpunkt</th>
                      <th className="px-4 py-2.5 font-medium">Provider</th>
                      <th className="px-4 py-2.5 font-medium">Terminal</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium text-right">Betrag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {payments.map((p) => {
                      const badge = statusBadge(p.status);
                      const terminal = terminals.find((t) => t.id === p.terminal_id);
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-accent/60">
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {p.initiated_at
                              ? new Date(p.initiated_at).toLocaleString("de-DE")
                              : "-"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {PROVIDER_LABELS[p.provider] || p.provider}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{terminal?.name || "-"}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {formatCurrency(p.amount)}
                          </td>
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
