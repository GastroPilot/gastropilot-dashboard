"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Download,
  FileArchive,
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
  Scale,
  Send,
  Trash2,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { restaurantsApi, type Restaurant } from "@/lib/api/restaurants";
import { ordersApi, type Order } from "@/lib/api/orders";
import { orderStatisticsApi, type RevenueStatistics } from "@/lib/api/order-statistics";
import { classifyPaymentMethod, PAYMENT_BUCKET_LABEL, type PaymentBucket } from "@/lib/finance/payment-methods";
import {
  createDailyClosing,
  listDailyClosings,
  getDailyClosing,
  deleteDailyClosing,
  triggerDsfinvkExport,
  getDsfinvkExportStatus,
  getDsfinvkExportDownloadUrl,
  getDailyClosingPdfUrl,
  getTssStatus,
  type DailyClosing,
  type TssStatus,
} from "@/lib/api/fiskaly";
import { getApiUrlForEndpoint } from "@/lib/api/client";

const DASHBOARD_CARD_HOVER_CLASS =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";
const DASHBOARD_CARD_SURFACE_CLASS =
  "relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";
const DASHBOARD_ROW_HOVER_CLASS =
  "transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-accent/60";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIsoDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function dayRange(date: string): { startIso: string; endIso: string } {
  return {
    startIso: `${date}T00:00:00Z`,
    endIso: `${date}T23:59:59Z`,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function paymentLabel(status: Order["payment_status"]): string {
  if (status === "paid") return "Bezahlt";
  if (status === "partial") return "Teilweise";
  return "Offen";
}

function orderStatusLabel(status: Order["status"]): string {
  if (status === "sent_to_kitchen") return "An Küche";
  if (status === "in_preparation") return "In Zubereitung";
  if (status === "ready") return "Fertig";
  if (status === "served") return "Serviert";
  if (status === "paid") return "Bezahlt";
  if (status === "canceled") return "Storniert";
  return "Offen";
}

function closingStateBadge(state: string): { label: string; className: string } {
  switch (state) {
    case "WORKING":
    case "PENDING":
      return { label: "In Verarbeitung", className: "bg-blue-500/15 text-blue-300" };
    case "COMPLETED":
      return { label: "Abgeschlossen", className: "bg-emerald-500/15 text-emerald-300" };
    case "ERROR":
      return { label: "Fehler", className: "bg-red-500/15 text-red-300" };
    case "DELETED":
      return { label: "Gelöscht", className: "bg-muted text-muted-foreground" };
    default:
      return { label: state, className: "bg-muted text-muted-foreground" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinanceDailyClosePage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayIsoDate());
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // DSFinV-K state
  const [tssStatus, setTssStatus] = useState<TssStatus | null>(null);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const toast = useToast();

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      setError(null);

      try {
        let currentRestaurant = restaurant;
        if (!currentRestaurant) {
          const restaurants = await restaurantsApi.list();
          currentRestaurant = restaurants[0] ?? null;
          setRestaurant(currentRestaurant);
        }

        if (!currentRestaurant) {
          setOrders([]);
          setRevenueStats(null);
          return;
        }

        const { startIso, endIso } = dayRange(selectedDate);
        const [orderData, revData, tssData, closingsData] = await Promise.all([
          ordersApi.list(currentRestaurant.id, {
            start_date: startIso,
            end_date: endIso,
          }),
          orderStatisticsApi.getRevenue(currentRestaurant.id, {
            start_date: startIso,
            end_date: endIso,
          }),
          getTssStatus().catch(() => null),
          listDailyClosings().catch(() => []),
        ]);

        setOrders(orderData);
        setRevenueStats(revData);
        setTssStatus(tssData);
        setDailyClosings(closingsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Daten konnten nicht geladen werden.";
        setError(message);
      } finally {
        setIsLoading(false);
        if (showRefreshing) setIsRefreshing(false);
      }
    },
    [restaurant, selectedDate]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll export status
  useEffect(() => {
    if (!activeExportId) return;
    const interval = setInterval(async () => {
      try {
        const status = await getDsfinvkExportStatus(activeExportId);
        if (status.state === "COMPLETED") {
          toast.add("DSFinV-K Export abgeschlossen. Download wird gestartet...");
          const completedExportId = activeExportId;
          setActiveExportId(null);
          setIsExporting(false);
          handleDownloadExport(completedExportId);
          loadData();
        } else if (status.state === "ERROR" || status.state === "CANCELLED") {
          toast.add(`Export fehlgeschlagen: ${status.state}`, "error");
          setActiveExportId(null);
          setIsExporting(false);
        }
      } catch {
        // silently retry
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeExportId, toast, loadData]);

  const paidOrders = useMemo(() => orders.filter((order) => order.payment_status === "paid"), [orders]);
  const openOrders = useMemo(
    () => orders.filter((order) => order.payment_status !== "paid" && order.status !== "canceled"),
    [orders]
  );
  const canceledOrders = useMemo(() => orders.filter((order) => order.status === "canceled"), [orders]);

  const closureSummary = useMemo(() => {
    const paidAmount = paidOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const openAmount = openOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const grossSubtotal = paidOrders.reduce((sum, order) => sum + (Number(order.subtotal) || 0), 0);
    const discounts = paidOrders.reduce((sum, order) => sum + (Number(order.discount_amount) || 0), 0);
    const tips = paidOrders.reduce((sum, order) => sum + (Number(order.tip_amount) || 0), 0);
    const taxes = paidOrders.reduce((sum, order) => sum + (Number(order.tax_amount) || 0), 0);

    const paymentBuckets = paidOrders.reduce<Record<PaymentBucket, number>>(
      (acc, order) => {
        const bucket = classifyPaymentMethod(order.payment_method);
        acc[bucket] += Number(order.total) || 0;
        return acc;
      },
      { cash: 0, card: 0, other: 0 }
    );

    return {
      paidAmount,
      openAmount,
      grossSubtotal,
      discounts,
      tips,
      taxes,
      paymentBuckets,
      isClosureReady: openOrders.length === 0,
    };
  }, [openOrders, paidOrders]);

  const paymentMix = useMemo(() => {
    const total = closureSummary.paidAmount || 1;
    return (Object.keys(closureSummary.paymentBuckets) as PaymentBucket[]).map((bucket) => {
      const value = closureSummary.paymentBuckets[bucket];
      return {
        bucket,
        value,
        ratio: (value / total) * 100,
        tone:
          bucket === "card"
            ? "bg-cyan-500"
            : bucket === "cash"
              ? "bg-emerald-500"
              : "bg-amber-500",
      };
    });
  }, [closureSummary.paidAmount, closureSummary.paymentBuckets]);

  const hourlyRevenue = useMemo(() => {
    const rows = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
      count: 0,
    }));

    for (const order of paidOrders) {
      try {
        const hour = parseISO(order.opened_at).getHours();
        rows[hour].revenue += Number(order.total) || 0;
        rows[hour].count += 1;
      } catch {
        // ignore invalid date rows
      }
    }

    const max = Math.max(...rows.map((row) => row.revenue), 1);
    return rows.map((row) => ({
      ...row,
      barHeight: (row.revenue / max) * 100,
    }));
  }, [paidOrders]);

  const activeHourData = useMemo(() => {
    if (hoveredHour !== null) {
      return hourlyRevenue.find((entry) => entry.hour === hoveredHour) ?? null;
    }
    return [...hourlyRevenue].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
  }, [hourlyRevenue, hoveredHour]);

  // Check if a closing already exists for the selected date
  const existingClosing = useMemo(
    () => dailyClosings.find((c) => c.business_date === selectedDate && c.state !== "DELETED"),
    [dailyClosings, selectedDate]
  );

  const isTseConfigured = tssStatus?.configured && tssStatus?.state === "INITIALIZED";

  const handleExportCsv = () => {
    const rows: string[][] = [
      ["Tagesabschluss", selectedDate],
      ["Restaurant", restaurant?.name ?? "-"],
      ["Bestellungen gesamt", String(orders.length)],
      ["Bezahlt", String(paidOrders.length)],
      ["Offen", String(openOrders.length)],
      ["Storniert", String(canceledOrders.length)],
      ["Umsatz bezahlt", closureSummary.paidAmount.toFixed(2)],
      ["Offene Summe", closureSummary.openAmount.toFixed(2)],
      ["Zwischensumme", closureSummary.grossSubtotal.toFixed(2)],
      ["Rabatte", closureSummary.discounts.toFixed(2)],
      ["Trinkgeld", closureSummary.tips.toFixed(2)],
      ["Steuer", closureSummary.taxes.toFixed(2)],
      ["Zahlungsart Bar", closureSummary.paymentBuckets.cash.toFixed(2)],
      ["Zahlungsart Karte", closureSummary.paymentBuckets.card.toFixed(2)],
      ["Zahlungsart Sonstige", closureSummary.paymentBuckets.other.toFixed(2)],
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tagesabschluss_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmitClosing = async () => {
    if (!closureSummary.isClosureReady) {
      toast.add("Es gibt noch offene Vorgänge. Bitte zuerst alle abschließen.", "error");
      return;
    }
    if (paidOrders.length === 0) {
      toast.add("Keine bezahlten Bestellungen für diesen Tag.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createDailyClosing({ business_date: selectedDate });
      if (result.state === "ERROR") {
        toast.add(`Tagesabschluss fehlgeschlagen: ${result.error}`, "error");
        return;
      }

      toast.add("Tagesabschluss übermittelt. Export & PDF werden erstellt...", "info");

      // Trigger DSFinV-K export automatically
      try {
        const exportResult = await triggerDsfinvkExport({ closing_id: result.closing_id });
        setActiveExportId(exportResult.export_id);
        setIsExporting(true);
      } catch {
        toast.add("DSFinV-K Export konnte nicht gestartet werden.", "error");
      }

      // Download PDF automatically
      handleDownloadPdf(result.closing_id, selectedDate);

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tagesabschluss fehlgeschlagen";
      toast.add(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClosing = async (closingId: string) => {
    try {
      await deleteDailyClosing(closingId);
      toast.add("Tagesabschluss gelöscht.");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Löschen fehlgeschlagen";
      toast.add(message, "error");
    }
  };

  const handleExportDsfinvk = async (closingId?: string) => {
    setIsExporting(true);
    try {
      const result = await triggerDsfinvkExport(
        closingId
          ? { closing_id: closingId }
          : { business_date_start: selectedDate, business_date_end: selectedDate }
      );
      setActiveExportId(result.export_id);
      toast.add("DSFinV-K Export gestartet. Bitte warten...", "info");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export fehlgeschlagen";
      toast.add(message, "error");
      setIsExporting(false);
    }
  };

  const handleDownloadExport = async (exportId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.add("Nicht eingeloggt. Bitte neu anmelden.", "error");
      return;
    }

    try {
      const url = getApiUrlForEndpoint(getDsfinvkExportDownloadUrl(exportId));
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
      link.download = `dsfinvk-export-${exportId.slice(0, 8)}.zip`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      toast.add("Export heruntergeladen.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download fehlgeschlagen";
      toast.add(message, "error");
    }
  };

  const handleDownloadPdf = async (closingId: string, businessDate: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.add("Nicht eingeloggt. Bitte neu anmelden.", "error");
      return;
    }

    try {
      const url = getApiUrlForEndpoint(getDailyClosingPdfUrl(closingId));
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("PDF-Download fehlgeschlagen");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `tagesabschluss_${businessDate}.pdf`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      toast.add("PDF heruntergeladen.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF-Download fehlgeschlagen";
      toast.add(message, "error");
    }
  };

  return (
    <FinanceModuleLayout
      title="Tagesabschluss"
      description="Tägliche Summen, Zahlarten und DSFinV-K Kassenabschluss."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </div>
      }
    >
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toast.toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
              t.variant === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : t.variant === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                  : "border-blue-500/40 bg-blue-500/10 text-blue-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Date picker + status */}
        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base">Abschlusstag</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-muted-foreground block mb-1">Datum</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full sm:w-52"
              />
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  closureSummary.isClosureReady
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/10"
                }`}
              >
                <span className="text-muted-foreground">Status: </span>
                <span className={closureSummary.isClosureReady ? "text-emerald-300" : "text-amber-300"}>
                  {closureSummary.isClosureReady ? "Abschlussfähig" : "Offene Vorgänge vorhanden"}
                </span>
              </div>
              {existingClosing ? (
                <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${closingStateBadge(existingClosing.state).className}`}>
                  DSFinV-K: {closingStateBadge(existingClosing.state).label}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-red-500/40 bg-red-500/10">
            <CardContent className="pt-4 text-sm text-red-200">{error}</CardContent>
          </Card>
        ) : null}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Umsatz bezahlt</CardTitle>
                <Wallet className="h-4 w-4 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(closureSummary.paidAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{paidOrders.length} bezahlte Belege</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Offener Betrag</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(closureSummary.openAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{openOrders.length} offene Belege</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Steuer / Rabatte</CardTitle>
                <Scale className="h-4 w-4 text-cyan-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">Steuer: {formatCurrency(closureSummary.taxes)}</p>
              <p className="text-sm text-foreground">Rabatte: {formatCurrency(closureSummary.discounts)}</p>
              <p className="text-xs text-muted-foreground mt-1">Trinkgeld: {formatCurrency(closureSummary.tips)}</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Bestellungen</CardTitle>
                <Receipt className="h-4 w-4 text-indigo-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{canceledOrders.length} storniert</p>
            </CardContent>
          </Card>
        </div>

        {/* DSFinV-K Tagesabschluss action */}
        {isTseConfigured ? (
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS} border-primary/20`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">DSFinV-K Kassenabschluss</CardTitle>
                <FileArchive className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingClosing ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-border/70 bg-background/40 p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Abschluss vom {existingClosing.business_date}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {existingClosing.transaction_count} Transaktionen &middot;{" "}
                          {formatCurrency(existingClosing.total_amount ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bar: {formatCurrency(existingClosing.total_cash ?? 0)} &middot;
                          Unbar: {formatCurrency(existingClosing.total_non_cash ?? 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${closingStateBadge(existingClosing.state).className}`}>
                          {closingStateBadge(existingClosing.state).label}
                        </span>
                      </div>
                    </div>

                    {existingClosing.error ? (
                      <p className="mt-2 text-xs text-red-300">{existingClosing.error}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleDownloadPdf(existingClosing.closing_id, existingClosing.business_date)}
                    >
                      <FileText className="h-4 w-4" />
                      Tagesabschluss drucken
                    </Button>

                    {existingClosing.dsfinvk_export_id && existingClosing.dsfinvk_export_state === "COMPLETED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDownloadExport(existingClosing.dsfinvk_export_id!)}
                      >
                        <FileArchive className="h-4 w-4" />
                        Finanzamt-Export herunterladen
                      </Button>
                    ) : null}

                    {existingClosing.state === "ERROR" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-300 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => handleDeleteClosing(existingClosing.closing_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Fehlerhaften Abschluss löschen
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Tagesabschluss für den {selectedDate} an die DSFinV-K Schnittstelle übermitteln.
                    Alle bezahlten Bestellungen und ihre TSE-Signaturen werden als Kassenabschluss gemeldet.
                  </p>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleSubmitClosing}
                    disabled={isSubmitting || !closureSummary.isClosureReady || paidOrders.length === 0}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Tagesabschluss einreichen
                  </Button>
                  {!closureSummary.isClosureReady ? (
                    <p className="text-xs text-amber-300">
                      Es gibt noch offene Vorgänge. Bitte zuerst alle Bestellungen abschließen.
                    </p>
                  ) : null}
                  {paidOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Keine bezahlten Bestellungen für diesen Tag vorhanden.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} border-amber-500/20`}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-sm text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  TSE ist nicht konfiguriert. Bitte zuerst unter{" "}
                  <Link href="/dashboard/finanzen/tse" className="text-primary hover:underline">
                    TSE / KassenSichV
                  </Link>{" "}
                  einrichten, um Tagesabschlüsse an DSFinV-K übermitteln zu können.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment mix + hourly chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Zahlungsarten</CardTitle>
                <Coins className="h-4 w-4 text-cyan-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMix.map((entry) => (
                <div
                  key={entry.bucket}
                  className={`space-y-1.5 rounded-md border border-border/70 bg-background/30 p-2.5 ${DASHBOARD_ROW_HOVER_CLASS}`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span>{PAYMENT_BUCKET_LABEL[entry.bucket]}</span>
                    <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
                  </div>
                  <div className="h-2.5 rounded bg-muted overflow-hidden">
                    <div className={`h-full ${entry.tone}`} style={{ width: `${Math.max(2, entry.ratio)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{entry.ratio.toFixed(1)}%</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={`xl:col-span-2 ${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Umsatz nach Stunde</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {activeHourData
                    ? `${String(activeHourData.hour).padStart(2, "0")}:00 · ${formatCurrency(activeHourData.revenue)}`
                    : "Keine Daten"}
                </span>
              </div>
              {activeHourData ? (
                <p className="text-xs text-muted-foreground">{activeHourData.count} Belege in der ausgewählten Stunde</p>
              ) : null}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lade Tagesdaten...
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-2">
                  {hourlyRevenue.map((entry) => (
                    <button
                      key={entry.hour}
                      type="button"
                      className="flex flex-col items-center gap-1"
                      onMouseEnter={() => setHoveredHour(entry.hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                      onFocus={() => setHoveredHour(entry.hour)}
                      onBlur={() => setHoveredHour(null)}
                      title={`${String(entry.hour).padStart(2, "0")}:00 - ${formatCurrency(entry.revenue)} (${entry.count} Belege)`}
                    >
                      <div
                        className={`h-20 w-full rounded border border-border/70 bg-background/40 overflow-hidden relative transition-colors ${
                          hoveredHour === entry.hour ? "bg-accent/40" : ""
                        }`}
                      >
                        {entry.revenue > 0 ? (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-primary/80"
                            style={{ height: `${Math.max(4, entry.barHeight)}%` }}
                          />
                        ) : null}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{String(entry.hour).padStart(2, "0")}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Open orders */}
        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Offene Vorgänge</CardTitle>
              {closureSummary.isClosureReady ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Abschluss möglich
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {openOrders.length === 0 ? (
              <p className="text-sm text-emerald-300">Keine offenen Vorgänge. Tagesabschluss ist möglich.</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Bestellung</th>
                        <th className="px-4 py-2.5 font-medium">Zeit</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium">Zahlung</th>
                        <th className="px-4 py-2.5 font-medium text-right">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {openOrders.map((order) => (
                        <tr key={order.id} className={DASHBOARD_ROW_HOVER_CLASS}>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-foreground">
                              {order.order_number || `#${order.id.slice(0, 8)}`}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{order.id}</div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {format(parseISO(order.opened_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </td>
                          <td className="px-4 py-2.5 text-amber-300">{orderStatusLabel(order.status)}</td>
                          <td className="px-4 py-2.5 text-red-300">{paymentLabel(order.payment_status)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                            {formatCurrency(order.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <Link href="/dashboard/finanzen/rechnungs-editor" className="text-primary hover:underline text-sm">
                    Offene Vorgänge im Rechnungs-Editor bearbeiten
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past closings */}
        {dailyClosings.length > 0 ? (
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Bisherige Tagesabschlüsse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Datum</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium text-right">Umsatz</th>
                      <th className="px-4 py-2.5 font-medium text-right">Bar</th>
                      <th className="px-4 py-2.5 font-medium text-right">Unbar</th>
                      <th className="px-4 py-2.5 font-medium text-right">TX</th>
                      <th className="px-4 py-2.5 font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {dailyClosings.filter((c) => c.state !== "DELETED").map((closing) => {
                      const badge = closingStateBadge(closing.state);
                      return (
                        <tr key={closing.closing_id} className={DASHBOARD_ROW_HOVER_CLASS}>
                          <td className="px-4 py-2.5 font-medium text-foreground">{closing.business_date}</td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency(closing.total_amount ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency(closing.total_cash ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency(closing.total_non_cash ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right">{closing.transaction_count ?? 0}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              {closing.state !== "ERROR" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-xs"
                                    onClick={() => handleDownloadPdf(closing.closing_id, closing.business_date)}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Drucken
                                  </Button>
                                </>
                              ) : null}
                              {closing.dsfinvk_export_id && closing.dsfinvk_export_state === "COMPLETED" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={() => handleDownloadExport(closing.dsfinvk_export_id!)}
                                >
                                  <FileArchive className="h-3.5 w-3.5" />
                                  Finanzamt-Export herunterladen
                                </Button>
                              ) : null}
                              {closing.state === "ERROR" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-xs text-red-300"
                                  onClick={() => handleDeleteClosing(closing.closing_id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Löschen
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Revenue stats reference */}
        {revenueStats ? (
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Statistik-Referenz (Tag)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                <p className="text-muted-foreground">API-Umsatz</p>
                <p className="font-semibold text-foreground">{formatCurrency(revenueStats.total_revenue)}</p>
              </div>
              <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                <p className="text-muted-foreground">API-Orders</p>
                <p className="font-semibold text-foreground">{revenueStats.total_orders}</p>
              </div>
              <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                <p className="text-muted-foreground">API-Avg</p>
                <p className="font-semibold text-foreground">{formatCurrency(revenueStats.average_order_value)}</p>
              </div>
              <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                <p className="text-muted-foreground">API-Tips</p>
                <p className="font-semibold text-foreground">{formatCurrency(revenueStats.total_tips)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </FinanceModuleLayout>
  );
}
