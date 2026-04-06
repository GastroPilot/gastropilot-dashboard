"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  QrCode,
  FileText,
  Loader2,
  Copy,
  Ban,
  Download,
  Archive,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildApiUrl, getApiBaseUrl, API_PREFIX } from "@/lib/api/config";
import {
  getTssStatus,
  setupTss,
  disableTss,
  listTransactions,
  retryTransaction,
  triggerExport,
  getExportStatus,
  listExports,
  createReceipt,
  type TssStatus,
  type FiskalyTransaction,
  type ExportListItem,
  type ExportStatus,
} from "@/lib/api/fiskaly";
import { restaurantsApi } from "@/lib/api/restaurants";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback(
    (message: string, variant: Toast["variant"] = "success") => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        4000
      );
    },
    []
  );
  return { toasts, add };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: string | null }) {
  if (!state)
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        Nicht konfiguriert
      </span>
    );

  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    INITIALIZED: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    CREATED: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    UNINITIALIZED: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    DISABLED: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const c = config[state] ?? config.CREATED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.icon}
      {state}
    </span>
  );
}

// ─── Transaction State Badge ──────────────────────────────────────────────────

function TxStateBadge({ state }: { state: string | null }) {
  if (!state) return null;

  if (state === "FINISHED")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Signiert
      </span>
    );

  if (state === "ERROR")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">
        <XCircle className="w-3 h-3" />
        Fehler
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
      {state}
    </span>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground sm:w-44 flex-shrink-0 font-medium">
        {label}
      </span>
      <span
        className={`text-xs text-foreground break-all ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FiskalyPage() {
  const { toasts, add: toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tssStatus, setTssStatus] = useState<TssStatus | null>(null);
  const [transactions, setTransactions] = useState<FiskalyTransaction[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Export state
  const [exports, setExports] = useState<ExportListItem[]>([]);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportTriggering, setExportTriggering] = useState(false);
  const [pollingExportId, setPollingExportId] = useState<string | null>(null);
  const [pollingState, setPollingState] = useState<ExportStatus | null>(null);
  const [creatingReceiptForOrder, setCreatingReceiptForOrder] = useState<string | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<{name: string; address: string; tax_number: string} | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [status, txs, exps] = await Promise.all([
        getTssStatus(),
        listTransactions(20).catch(() => []),
        listExports().catch(() => []),
      ]);
      setTssStatus(status);
      setTransactions(txs);
      setExports(exps);

      // Load restaurant info for receipt creation
      if (!restaurantInfo) {
        try {
          const restaurants = await restaurantsApi.list();
          if (restaurants.length > 0) {
            const r = restaurants[0];
            setRestaurantInfo({
              name: r.name || "",
              address: r.address || "",
              tax_number: "",
            });
          }
        } catch { /* non-critical */ }
      }
    } catch (err: any) {
      toast(err?.message || "Fehler beim Laden", "error");
    } finally {
      setLoading(false);
    }
  }, [toast, restaurantInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const result = await setupTss({
        admin_pin: adminPin.length >= 6 ? adminPin : undefined,
        restaurant_name: restaurantInfo?.name || "",
        restaurant_address: restaurantInfo?.address?.split(",")[0]?.trim() || "",
        restaurant_zip: "",
        restaurant_city: restaurantInfo?.address?.split(",")[1]?.trim() || "",
        restaurant_tax_number: restaurantInfo?.tax_number || "",
      });
      toast(
        `TSS erfolgreich eingerichtet (${result.tss_serial_number.slice(0, 16)}...)`,
        "success"
      );
      setAdminPin("");
      await loadData();
    } catch (err: any) {
      toast(err?.message || "TSS-Einrichtung fehlgeschlagen", "error");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable = async () => {
    if (
      !window.confirm(
        "TSS wirklich deaktivieren? Diese Aktion ist UNWIDERRUFLICH! " +
          "Die TSS kann danach nicht mehr verwendet werden."
      )
    )
      return;

    setDisableLoading(true);
    try {
      await disableTss();
      toast("TSS wurde deaktiviert", "info");
      await loadData();
    } catch (err: any) {
      toast(err?.message || "TSS-Deaktivierung fehlgeschlagen", "error");
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRetry = async (orderId: string) => {
    setRetryingId(orderId);
    try {
      await retryTransaction(orderId);
      toast("Transaktion erfolgreich signiert", "success");
      await loadData();
    } catch (err: any) {
      toast(err?.message || "Signierung fehlgeschlagen", "error");
    } finally {
      setRetryingId(null);
    }
  };

  const handleTriggerExport = async () => {
    setExportTriggering(true);
    try {
      const resp = await triggerExport({
        start_date: exportStartDate || undefined,
        end_date: exportEndDate || undefined,
      });
      toast("Export gestartet — wird verarbeitet...", "success");
      setPollingExportId(resp.export_id);
      setPollingState({ export_id: resp.export_id, state: "PENDING", time_start: null, time_end: null, time_expiration: null, estimated_time_of_completion: null });
    } catch (err: any) {
      toast(err?.message || "Export fehlgeschlagen", "error");
    } finally {
      setExportTriggering(false);
    }
  };

  // Poll export status
  useEffect(() => {
    if (!pollingExportId) return;
    const interval = setInterval(async () => {
      try {
        const status = await getExportStatus(pollingExportId);
        setPollingState(status);
        if (status.state === "COMPLETED" || status.state === "ERROR" || status.state === "CANCELLED") {
          clearInterval(interval);
          setPollingExportId(null);
          if (status.state === "COMPLETED") {
            toast("Export abgeschlossen — bereit zum Download", "success");
          } else {
            toast(`Export ${status.state === "ERROR" ? "fehlgeschlagen" : "abgebrochen"}`, "error");
          }
          await loadData();
        }
      } catch {
        clearInterval(interval);
        setPollingExportId(null);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingExportId, toast, loadData]);

  const handleDownloadExport = async (exportId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const url = buildApiUrl(getApiBaseUrl(), API_PREFIX, `/fiskaly/exports/${exportId}/download`);
    try {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Download fehlgeschlagen");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `tse-export-${exportId.slice(0, 8)}.tar`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Export heruntergeladen", "success");
    } catch (err: any) {
      toast(err?.message || "Download fehlgeschlagen", "error");
    }
  };

  const handleCreateReceipt = async (orderId: string) => {
    if (!restaurantInfo) {
      toast("Restaurant-Daten nicht geladen", "error");
      return;
    }
    setCreatingReceiptForOrder(orderId);
    try {
      const resp = await createReceipt({
        order_id: orderId,
        restaurant_name: restaurantInfo.name,
        restaurant_address: restaurantInfo.address,
        restaurant_tax_number: restaurantInfo.tax_number,
      });
      if (resp.status === "already_exists") {
        toast("eReceipt existiert bereits", "info");
      } else {
        toast("eReceipt erstellt", "success");
      }
      if (resp.public_url) {
        window.open(resp.public_url, "_blank");
      }
      await loadData();
    } catch (err: any) {
      toast(err?.message || "eReceipt-Erstellung fehlgeschlagen", "error");
    } finally {
      setCreatingReceiptForOrder(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("In Zwischenablage kopiert", "info");
  };

  const formatUnixDate = (ts: number | null) => {
    if (!ts) return null;
    return new Date(ts * 1000).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isInitialized = tssStatus?.state === "INITIALIZED";
  const isDisabled = tssStatus?.state === "DISABLED";
  const isConfigured = tssStatus?.configured === true;

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                TSE / KassenSichV
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Technische Sicherheitseinrichtung (fiskaly Cloud-TSE)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* TSS Status Card */}
        <div className="rounded-lg border border-border bg-card/60 shadow-lg shadow-black/20 overflow-hidden">
          <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-background/70">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  TSS-Status
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konfiguration der Technischen Sicherheitseinrichtung
                </p>
              </div>
            </div>
            <StatusBadge state={tssStatus?.state ?? null} />
          </div>

          <div className="p-4">
            {isConfigured ? (
              <div className="space-y-1">
                <DetailRow
                  label="TSS-Seriennummer"
                  value={tssStatus?.tss_serial_number}
                  mono
                />
                <DetailRow label="TSS-ID" value={tssStatus?.tss_id} mono />
                <DetailRow
                  label="Client-ID"
                  value={tssStatus?.client_id}
                  mono
                />
                <DetailRow
                  label="Kassen-ID (Client)"
                  value={tssStatus?.client_serial_number}
                  mono
                />
                <DetailRow
                  label="Eingerichtet am"
                  value={
                    tssStatus?.created_at
                      ? new Date(tssStatus.created_at).toLocaleString("de-DE")
                      : null
                  }
                />

                {isInitialized && (
                  <div className="pt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable}
                      disabled={disableLoading}
                      className="gap-1.5"
                    >
                      {disableLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                      TSS deaktivieren
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Achtung: Diese Aktion ist unwiderruflich!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-200">
                    <p className="font-medium">
                      Keine TSE eingerichtet
                    </p>
                    <p className="mt-1 text-amber-300/80">
                      Gemäß KassenSichV muss jedes elektronische
                      Aufzeichnungssystem eine Technische
                      Sicherheitseinrichtung (TSE) verwenden.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Admin-PIN (optional, min. 6 Zeichen)
                    </label>
                    <Input
                      type="text"
                      placeholder="Wird automatisch generiert wenn leer"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="max-w-xs text-sm"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSetup}
                    disabled={
                      setupLoading || (adminPin.length > 0 && adminPin.length < 6)
                    }
                    className="gap-1.5"
                  >
                    {setupLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    TSS einrichten
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transactions List */}
        {isConfigured && (
          <div className="rounded-lg border border-border bg-card/60 shadow-lg shadow-black/20 overflow-hidden">
            <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-background/70">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    TSE-Transaktionen
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Signierte Belege (letzte 20)
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Noch keine signierten Transaktionen vorhanden.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="px-4 py-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <TxStateBadge state={tx.tx_state} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground flex items-center gap-2">
                            {tx.tx_number != null && (
                              <span>Nr. {tx.tx_number}</span>
                            )}
                            <span className="text-muted-foreground">
                              {tx.receipt_type ?? "RECEIPT"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Bestellung:{" "}
                            <span className="font-mono">
                              {tx.order_id.slice(0, 8)}...
                            </span>
                            {tx.created_at && (
                              <span className="ml-2">
                                {new Date(tx.created_at).toLocaleString(
                                  "de-DE",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            )}
                          </div>
                          {tx.error && (
                            <div className="text-xs text-red-400 mt-1 flex items-start gap-1">
                              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="break-all">{tx.error}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {tx.qr_code_data && (
                          <button
                            onClick={() => copyToClipboard(tx.qr_code_data!)}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="QR-Code-Daten kopieren"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        {tx.signature_value && (
                          <button
                            onClick={() => copyToClipboard(tx.signature_value!)}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Signatur kopieren"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {tx.tx_state === "FINISHED" && !tx.receipt_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateReceipt(tx.order_id)}
                            disabled={creatingReceiptForOrder === tx.order_id}
                            className="gap-1 text-xs"
                          >
                            {creatingReceiptForOrder === tx.order_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                            eReceipt
                          </Button>
                        )}
                        {tx.receipt_public_url && (
                          <a
                            href={tx.receipt_public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-accent text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="eReceipt öffnen"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {tx.tx_state === "ERROR" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(tx.order_id)}
                            disabled={retryingId === tx.order_id}
                            className="gap-1 text-xs"
                          >
                            {retryingId === tx.order_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Export for Tax Authorities */}
        {isConfigured && isInitialized && (
          <div className="rounded-lg border border-border bg-card/60 shadow-lg shadow-black/20 overflow-hidden">
            <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-background/70">
              <div className="flex items-start gap-2">
                <Archive className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    TSE-Export (Finanzamt)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exportiert signierte Transaktionsdaten als TAR-Archiv
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Trigger new export */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Von (optional)
                    </label>
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="text-sm w-44"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Bis (optional)
                    </label>
                    <Input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="text-sm w-44"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleTriggerExport}
                      disabled={exportTriggering || !!pollingExportId}
                      className="gap-1.5"
                    >
                      {exportTriggering || pollingExportId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                      {pollingExportId ? "Wird erstellt..." : "Export starten"}
                    </Button>
                  </div>
                </div>

                {!exportStartDate && !exportEndDate && (
                  <p className="text-xs text-muted-foreground">
                    Ohne Datumsfilter werden alle Transaktionen exportiert.
                  </p>
                )}
              </div>

              {/* Polling status */}
              {pollingState && pollingExportId && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                  <div className="text-xs text-blue-200">
                    <p className="font-medium">Export wird verarbeitet...</p>
                    <p className="mt-0.5 text-blue-300/80">
                      Status: {pollingState.state}
                      {pollingState.estimated_time_of_completion && (
                        <> — Geschätzt fertig: {formatUnixDate(pollingState.estimated_time_of_completion)}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Previous exports */}
              {exports.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Bisherige Exports
                  </h3>
                  <div className="divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
                    {exports.map((exp) => (
                      <div
                        key={exp.export_id}
                        className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge state={exp.state} />
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{exp.export_id.slice(0, 8)}...</span>
                            {exp.time_request && (
                              <span className="ml-2">
                                <Calendar className="w-3 h-3 inline mr-0.5" />
                                {formatUnixDate(exp.time_request)}
                              </span>
                            )}
                            {exp.time_expiration && (
                              <span className="ml-2 text-amber-400/80">
                                <Clock className="w-3 h-3 inline mr-0.5" />
                                Ablauf: {formatUnixDate(exp.time_expiration)}
                              </span>
                            )}
                          </div>
                        </div>
                        {exp.state === "COMPLETED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadExport(exp.export_id)}
                            className="gap-1 text-xs flex-shrink-0"
                          >
                            <Download className="w-3 h-3" />
                            TAR
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium animate-in slide-in-from-right-5 ${
                t.variant === "success"
                  ? "bg-emerald-600 text-white"
                  : t.variant === "error"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
