"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Calendar, Clock, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { getApiUrlForEndpoint } from "@/lib/api/client";
import {
  getExportStatus,
  getTssStatus,
  listExports,
  triggerExport,
  type ExportListItem,
  type ExportStatus,
  type TssStatus,
} from "@/lib/api/fiskaly";

type Feedback = {
  variant: "success" | "error" | "info";
  message: string;
} | null;

function formatUnixDate(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapExportStateBadge(state: string): { label: string; className: string } {
  if (state === "COMPLETED") {
    return { label: state, className: "bg-emerald-500/15 text-emerald-300" };
  }
  if (state === "PENDING" || state === "WORKING") {
    return { label: state, className: "bg-blue-500/15 text-blue-300" };
  }
  if (state === "ERROR" || state === "CANCELLED") {
    return { label: state, className: "bg-red-500/15 text-red-300" };
  }
  return { label: state, className: "bg-muted text-muted-foreground" };
}

export default function FinanceTaxExportPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tssStatus, setTssStatus] = useState<TssStatus | null>(null);
  const [exports, setExports] = useState<ExportListItem[]>([]);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportTriggering, setExportTriggering] = useState(false);
  const [pollingExportId, setPollingExportId] = useState<string | null>(null);
  const [pollingState, setPollingState] = useState<ExportStatus | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [status, exps] = await Promise.all([
        getTssStatus().catch(() => null),
        listExports().catch(() => []),
      ]);
      setTssStatus(status);
      setExports(exps);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Daten konnten nicht geladen werden.";
      setFeedback({ variant: "error", message });
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerExport = async () => {
    setExportTriggering(true);
    setFeedback(null);
    try {
      const response = await triggerExport({
        start_date: exportStartDate || undefined,
        end_date: exportEndDate || undefined,
      });
      setPollingExportId(response.export_id);
      setPollingState({
        export_id: response.export_id,
        state: "PENDING",
        time_start: null,
        time_end: null,
        time_expiration: null,
        estimated_time_of_completion: null,
      });
      setFeedback({ variant: "success", message: "Export wurde gestartet und wird verarbeitet." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export konnte nicht gestartet werden.";
      setFeedback({ variant: "error", message });
    } finally {
      setExportTriggering(false);
    }
  };

  useEffect(() => {
    if (!pollingExportId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getExportStatus(pollingExportId);
        setPollingState(status);
        if (["COMPLETED", "ERROR", "CANCELLED"].includes(status.state)) {
          clearInterval(interval);
          setPollingExportId(null);
          if (status.state === "COMPLETED") {
            setFeedback({ variant: "success", message: "Export abgeschlossen und downloadbereit." });
          } else {
            setFeedback({
              variant: "error",
              message: `Export ${status.state === "ERROR" ? "fehlgeschlagen" : "abgebrochen"}.`,
            });
          }
          await loadData(true);
        }
      } catch {
        clearInterval(interval);
        setPollingExportId(null);
        setFeedback({ variant: "error", message: "Export-Status konnte nicht abgefragt werden." });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingExportId, loadData]);

  const handleDownloadExport = async (exportId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setFeedback({ variant: "error", message: "Nicht eingeloggt. Bitte neu anmelden." });
      return;
    }

    try {
      const url = getApiUrlForEndpoint(`/fiskaly/exports/${exportId}/download`);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Download fehlgeschlagen");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `tse-export-${exportId.slice(0, 8)}.tar`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setFeedback({ variant: "success", message: "Export heruntergeladen." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download fehlgeschlagen";
      setFeedback({ variant: "error", message });
    }
  };

  const canExport = tssStatus?.configured && tssStatus?.state === "INITIALIZED";

  const exportSummary = useMemo(() => {
    const completed = exports.filter((entry) => entry.state === "COMPLETED").length;
    const working = exports.filter((entry) => entry.state === "WORKING" || entry.state === "PENDING").length;
    const failed = exports.filter((entry) => entry.state === "ERROR").length;
    return { total: exports.length, completed, working, failed };
  }, [exports]);

  return (
    <FinanceModuleLayout
      title="Finanzamt-Export"
      description="TSE-Export (TAR) für Finanzamt und Prüfungsprozesse."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">TSE Zustand</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{tssStatus?.state ?? "Nicht konfiguriert"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tssStatus?.configured ? "Konfiguriert" : "Nicht konfiguriert"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Exports gesamt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{exportSummary.total}</p>
              <p className="text-xs text-muted-foreground mt-1">{exportSummary.completed} abgeschlossen</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aktiv verarbeitet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{exportSummary.working}</p>
              <p className="text-xs text-muted-foreground mt-1">PENDING / WORKING</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Fehlgeschlagen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{exportSummary.failed}</p>
              <p className="text-xs text-muted-foreground mt-1">Status ERROR</p>
            </CardContent>
          </Card>
        </div>

        {!canExport ? (
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-base">Export aktuell nicht verfügbar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-100">
              <p>
                Für den Finanzamt-Export muss die TSE konfiguriert und im Status <strong>INITIALIZED</strong> sein.
              </p>
              <Link href="/dashboard/finanzen/tse" className="inline-flex text-primary hover:underline">
                Zur TSE-Konfiguration
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Neuen Export starten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Von (optional)</label>
                <Input
                  type="date"
                  value={exportStartDate}
                  onChange={(event) => setExportStartDate(event.target.value)}
                  className="text-sm w-44"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Bis (optional)</label>
                <Input
                  type="date"
                  value={exportEndDate}
                  onChange={(event) => setExportEndDate(event.target.value)}
                  className="text-sm w-44"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleTriggerExport}
                  disabled={!canExport || exportTriggering || !!pollingExportId}
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

            {!exportStartDate && !exportEndDate ? (
              <p className="text-xs text-muted-foreground">
                Ohne Datumsfilter werden alle signierten Transaktionen exportiert.
              </p>
            ) : null}

            {pollingState && pollingExportId ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                <div className="text-xs text-blue-200">
                  <p className="font-medium">Export wird verarbeitet...</p>
                  <p className="mt-0.5 text-blue-300/80">
                    Status: {pollingState.state}
                    {pollingState.estimated_time_of_completion ? (
                      <> — geschätzt fertig: {formatUnixDate(pollingState.estimated_time_of_completion)}</>
                    ) : null}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Bisherige Exporte</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 flex items-center justify-center text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lade Exporte...
              </div>
            ) : exports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Exporte vorhanden.</p>
            ) : (
              <div className="divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
                {exports.map((exp) => {
                  const badge = mapExportStateBadge(exp.state);
                  return (
                    <div
                      key={exp.export_id}
                      className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-mono">{exp.export_id.slice(0, 8)}...</span>
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatUnixDate(exp.time_request)}
                          </span>
                          {exp.time_expiration ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-amber-300/90">
                              <Clock className="w-3 h-3" />
                              Ablauf: {formatUnixDate(exp.time_expiration)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {exp.state === "COMPLETED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExport(exp.export_id)}
                          className="gap-1 text-xs"
                        >
                          <Download className="w-3 h-3" />
                          TAR
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FinanceModuleLayout>
  );
}
