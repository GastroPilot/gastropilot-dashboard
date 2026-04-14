"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import {
  triggerExport,
  getExportStatus,
  getTssStatus,
  triggerDsfinvkExport,
  getDsfinvkExportStatus,
  getDsfinvkExportDownloadUrl,
  getExportDownloadUrl,
  type TssStatus,
} from "@/lib/api/fiskaly";
import { getApiUrlForEndpoint } from "@/lib/api/client";

const SURFACE =
  "relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";
const HOVER =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";

type ExportJob = {
  id: string;
  type: "tse" | "dsfinvk" | "gobd";
  label: string;
  state: "idle" | "pending" | "completed" | "error";
  exportId?: string;
};

export default function FinanzamtExportPage() {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tssStatus, setTssStatus] = useState<TssStatus | null>(null);
  const [tssLoaded, setTssLoaded] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const loadTssStatus = async () => {
    try {
      const status = await getTssStatus();
      setTssStatus(status);
    } catch {
      setTssStatus(null);
    } finally {
      setTssLoaded(true);
    }
  };

  if (!tssLoaded) loadTssStatus();

  const isTseConfigured = tssStatus?.configured && tssStatus?.state === "INITIALIZED";

  const downloadFile = async (url: string, filename: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const response = await fetch(getApiUrlForEndpoint(url), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Download fehlgeschlagen");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(link);
  };

  const updateJob = (id: string, update: Partial<ExportJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...update } : j)));
  };

  const pollExportStatus = async (
    exportId: string,
    pollFn: (id: string) => Promise<{ state: string }>,
    jobId: string
  ) => {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const status = await pollFn(exportId);
        if (status.state === "COMPLETED") {
          updateJob(jobId, { state: "completed" });
          return true;
        }
        if (status.state === "ERROR" || status.state === "CANCELLED") {
          updateJob(jobId, { state: "error" });
          return false;
        }
      } catch {
        // retry
      }
    }
    updateJob(jobId, { state: "error" });
    return false;
  };

  const handleRunFullExport = async () => {
    setIsRunning(true);

    const newJobs: ExportJob[] = [
      { id: "gobd", type: "gobd", label: "GoBD-Datenexport (CSV)", state: "pending" },
    ];
    if (isTseConfigured) {
      newJobs.push(
        { id: "tse", type: "tse", label: "TSE-Export (TAR)", state: "idle" },
        { id: "dsfinvk", type: "dsfinvk", label: "DSFinV-K Export (ZIP)", state: "idle" },
      );
    }
    setJobs(newJobs);

    // 1) GoBD Export (direct download, no polling)
    try {
      await downloadFile(
        `/fiskaly/gobd-export?start_date=${startDate}&end_date=${endDate}`,
        `gobd_export_${startDate}_${endDate}.zip`
      );
      updateJob("gobd", { state: "completed" });
    } catch {
      updateJob("gobd", { state: "error" });
    }

    if (isTseConfigured) {
      // 2) TSE Export
      updateJob("tse", { state: "pending" });
      try {
        const tseResp = await triggerExport({ start_date: startDate, end_date: endDate });
        updateJob("tse", { exportId: tseResp.export_id });
        const tseOk = await pollExportStatus(tseResp.export_id, getExportStatus, "tse");
        if (tseOk) {
          await downloadFile(
            getExportDownloadUrl(tseResp.export_id),
            `tse_export_${startDate}_${endDate}.tar`
          );
        }
      } catch {
        updateJob("tse", { state: "error" });
      }

      // 3) DSFinV-K Export
      updateJob("dsfinvk", { state: "pending" });
      try {
        const dsResp = await triggerDsfinvkExport({
          business_date_start: startDate,
          business_date_end: endDate,
        });
        updateJob("dsfinvk", { exportId: dsResp.export_id });
        const dsOk = await pollExportStatus(dsResp.export_id, getDsfinvkExportStatus, "dsfinvk");
        if (dsOk) {
          await downloadFile(
            getDsfinvkExportDownloadUrl(dsResp.export_id),
            `dsfinvk_export_${startDate}_${endDate}.zip`
          );
        }
      } catch {
        updateJob("dsfinvk", { state: "error" });
      }
    }

    setIsRunning(false);
  };

  return (
    <FinanceModuleLayout
      title="Finanzamt-Export"
      description="Datenexporte für die Betriebsprüfung gem. § 147 AO, GoBD, KassenSichV und DSFinV-K."
    >
      <div className="space-y-6">
        {/* Legal info */}
        <Card className={`${SURFACE} ${HOVER} border-primary/20`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Betriebsprüfung</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Bei einer Betriebsprüfung (§ 193 AO) muss das Kassensystem alle Geschäftsvorfälle
              lückenlos und unveränderbar bereitstellen können. Dieser Export bündelt alle
              erforderlichen Daten in einem Vorgang.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium text-foreground">GoBD-Datenexport</span>
                </div>
                <p className="text-xs">
                  Alle Bestellungen, Einzelpositionen, MwSt-Aufschlüsselung, Zahlungsarten
                  und Tagesabschlüsse als CSV-Dateien (§ 146, § 147 AO).
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-medium text-foreground">TSE-Export</span>
                </div>
                <p className="text-xs">
                  Vollständiges TSE-Transaktionsarchiv mit allen Signaturdaten
                  gem. § 146a AO und KassenSichV.
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileArchive className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium text-foreground">DSFinV-K Export</span>
                </div>
                <p className="text-xs">
                  Strukturierter Export gem. der Digitalen Schnittstelle der Finanzverwaltung
                  für Kassensysteme (DSFinV-K).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date range + trigger */}
        <Card className={`${SURFACE} ${HOVER}`}>
          <CardHeader>
            <CardTitle className="text-base">Export starten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Von</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bis</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button
                onClick={handleRunFullExport}
                disabled={isRunning || !startDate || !endDate}
                className="gap-2"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Alle Exporte erstellen & herunterladen
              </Button>
            </div>

            {!isTseConfigured && tssLoaded ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                TSE ist nicht konfiguriert. TSE- und DSFinV-K-Exporte sind nicht verfügbar.
                Der GoBD-Datenexport (CSV) wird trotzdem erstellt.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Job progress */}
        {jobs.length > 0 ? (
          <Card className={`${SURFACE} ${HOVER}`}>
            <CardHeader>
              <CardTitle className="text-base">Export-Fortschritt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 ${
                    job.state === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : job.state === "error"
                        ? "border-red-500/30 bg-red-500/10"
                        : job.state === "pending"
                          ? "border-blue-500/30 bg-blue-500/10"
                          : "border-border bg-background/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {job.state === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : job.state === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    ) : job.state === "pending" ? (
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{job.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {job.state === "completed"
                      ? "Heruntergeladen"
                      : job.state === "error"
                        ? "Fehlgeschlagen"
                        : job.state === "pending"
                          ? "Wird erstellt..."
                          : "Warten..."}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Legal references */}
        <Card className={`${SURFACE}`}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Rechtsgrundlagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">§ 146 AO</span> — Ordnungsvorschriften für Buchführung und Aufzeichnungen
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">§ 146a AO</span> — Ordnungsvorschrift für elektronische Aufzeichnungssysteme
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">§ 147 AO</span> — Aufbewahrung von Unterlagen (10 Jahre)
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">§ 193 AO</span> — Zulässigkeit einer Außenprüfung
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">GoBD</span> — Grundsätze ordnungsmäßiger Buchführung (BMF-Schreiben)
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">KassenSichV</span> — Kassensicherungsverordnung
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">DSFinV-K</span> — Digitale Schnittstelle der Finanzverwaltung für Kassensysteme
              </div>
              <div className="rounded border border-border/50 bg-background/30 px-3 py-2">
                <span className="font-medium text-foreground">§ 14 UStG</span> — Ausstellung von Rechnungen
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceModuleLayout>
  );
}
