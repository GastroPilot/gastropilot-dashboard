"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { Download, Loader2, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { FinanceRangeControls } from "@/components/finance/finance-range-controls";
import { DropdownSelector } from "@/components/area-selector";
import { type FinanceRangePreset, resolveFinanceRange } from "@/lib/finance/date-range";
import { restaurantsApi, type Restaurant } from "@/lib/api/restaurants";
import { ordersApi, type Order } from "@/lib/api/orders";
import { getApiUrlForEndpoint } from "@/lib/api/client";
import { OrderDetailDialog } from "@/components/order-detail-dialog";

type InvoiceFilter = "all" | "paid" | "open";
const INVOICE_FILTER_OPTIONS: Array<{ id: InvoiceFilter; label: string }> = [
  { id: "all", label: "Alle Rechnungen" },
  { id: "paid", label: "Nur bezahlt" },
  { id: "open", label: "Offen / Teilweise" },
];
const DASHBOARD_CARD_HOVER_CLASS =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";
const DASHBOARD_CARD_SURFACE_CLASS =
  "relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";
const DASHBOARD_ROW_HOVER_CLASS =
  "transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-accent/60";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return { toasts, notify };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatOrderDate(value: string): string {
  return format(parseISO(value), "dd.MM.yyyy HH:mm", { locale: de });
}

function paymentStatusLabel(status: Order["payment_status"]): string {
  if (status === "paid") return "Bezahlt";
  if (status === "partial") return "Teilweise";
  return "Offen";
}

function paymentStatusTone(status: Order["payment_status"]): string {
  if (status === "paid") return "text-emerald-300";
  if (status === "partial") return "text-amber-300";
  return "text-red-300";
}

export default function FinanceInvoiceEditorPage() {
  const { toasts, notify } = useToast();
  const pageSize = 20;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [appliedPreset, setAppliedPreset] = useState<FinanceRangePreset>("30d");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState(
    format(startOfDay(subDays(new Date(), 29)), "yyyy-MM-dd")
  );
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [draftPreset, setDraftPreset] = useState<FinanceRangePreset>("30d");
  const [draftCustomStartDate, setDraftCustomStartDate] = useState(
    format(startOfDay(subDays(new Date(), 29)), "yyyy-MM-dd")
  );
  const [draftCustomEndDate, setDraftCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const draftResolvedRange = useMemo(
    () =>
      resolveFinanceRange({
        preset: draftPreset,
        customStartDate: draftCustomStartDate,
        customEndDate: draftCustomEndDate,
      }),
    [draftCustomEndDate, draftCustomStartDate, draftPreset]
  );

  const resolvedRange = useMemo(
    () =>
      resolveFinanceRange({
        preset: appliedPreset,
        customStartDate: appliedCustomStartDate,
        customEndDate: appliedCustomEndDate,
      }),
    [appliedCustomEndDate, appliedCustomStartDate, appliedPreset]
  );

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
          return;
        }

        const data = await ordersApi.list(currentRestaurant.id, {
          start_date: resolvedRange.fromIso,
          end_date: resolvedRange.toIso,
        });
        setOrders(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Daten konnten nicht geladen werden";
        setError(message);
      } finally {
        setIsLoading(false);
        if (showRefreshing) setIsRefreshing(false);
      }
    },
    [restaurant, resolvedRange.fromIso, resolvedRange.toIso]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    return [...orders]
      .filter((order) => {
        if (invoiceFilter === "paid") return order.payment_status === "paid";
        if (invoiceFilter === "open") return order.payment_status !== "paid";
        return true;
      })
      .filter((order) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.trim().toLowerCase();
        const number = (order.order_number ?? "").toLowerCase();
        const idPart = order.id.slice(0, 8).toLowerCase();
        const method = (order.payment_method ?? "").toLowerCase();
        return number.includes(query) || idPart.includes(query) || method.includes(query);
      })
      .sort((a, b) => parseISO(b.opened_at).getTime() - parseISO(a.opened_at).getTime());
  }, [invoiceFilter, orders, searchQuery]);

  const summary = useMemo(() => {
    const totalInvoices = filteredOrders.length;
    const paidInvoices = filteredOrders.filter((order) => order.payment_status === "paid").length;
    const openInvoices = filteredOrders.filter((order) => order.payment_status !== "paid").length;
    const totalAmount = filteredOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const paidAmount = filteredOrders
      .filter((order) => order.payment_status === "paid")
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    return {
      totalInvoices,
      paidInvoices,
      openInvoices,
      totalAmount,
      paidAmount,
    };
  }, [filteredOrders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedOrders = filteredOrders.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceFilter, searchQuery, resolvedRange.fromIso, resolvedRange.toIso]);

  const hasPendingRangeChanges =
    draftPreset !== appliedPreset ||
    draftCustomStartDate !== appliedCustomStartDate ||
    draftCustomEndDate !== appliedCustomEndDate;

  const handleApplyOrRefresh = useCallback(() => {
    if (isRefreshing) return;

    if (hasPendingRangeChanges) {
      setAppliedPreset(draftPreset);
      setAppliedCustomStartDate(draftCustomStartDate);
      setAppliedCustomEndDate(draftCustomEndDate);
      return;
    }

    void loadData(true);
  }, [draftCustomEndDate, draftCustomStartDate, draftPreset, hasPendingRangeChanges, isRefreshing, loadData]);

  const openEditor = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDialogOpen(true);
  };

  const handleDownloadInvoice = async (orderId: string, orderNumber: string | null) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      notify("Nicht angemeldet", "error");
      return;
    }

    try {
      const pdfUrl = getApiUrlForEndpoint(`/invoices/${orderId}/pdf`);
      const response = await fetch(pdfUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          notify("Nicht angemeldet oder keine Berechtigung", "error");
          return;
        }
        const errorText = await response.text().catch(() => "Unbekannter Fehler");
        notify(`Fehler beim Generieren der Rechnung: ${response.status} ${errorText}`, "error");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rechnung_${orderNumber || orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      notify("Rechnung heruntergeladen", "success");
    } catch (err) {
      console.error(err);
      notify("Fehler beim Download der Rechnung", "error");
    }
  };

  return (
    <FinanceModuleLayout
      title="Rechnungs-Editor"
      description="Rechnungen filtern, bearbeiten und als PDF exportieren."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyOrRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {hasPendingRangeChanges ? "Anwenden" : "Aktualisieren"}
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base">Zeitraum und Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FinanceRangeControls
              preset={draftPreset}
              startDate={draftResolvedRange.fromDate}
              endDate={draftResolvedRange.toDate}
              disabled={isLoading}
              onPresetChange={(nextPreset) => {
                setDraftPreset(nextPreset);
                if (nextPreset !== "custom") {
                  setDraftCustomStartDate("");
                  setDraftCustomEndDate("");
                }
              }}
              onStartDateChange={(value) => {
                setDraftPreset("custom");
                setDraftCustomStartDate(value);
              }}
              onEndDateChange={(value) => {
                setDraftPreset("custom");
                setDraftCustomEndDate(value);
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Suche nach Rechnungsnr., ID oder Zahlungsart"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <DropdownSelector
                options={INVOICE_FILTER_OPTIONS}
                selectedId={invoiceFilter}
                onSelect={setInvoiceFilter}
                placeholder="Alle Rechnungen"
                triggerClassName="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card/50 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
                menuWidthClassName="w-full"
                zIndexClassName="z-[80]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rechnungen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalInvoices}</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bezahlt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.paidInvoices}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(summary.paidAmount)}</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Offen / Teilweise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.openInvoices}</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Gesamtvolumen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <Card className="border-red-500/40 bg-red-500/10">
            <CardContent className="pt-4 text-sm text-red-200">{error}</CardContent>
          </Card>
        ) : null}

        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base">Rechnungsliste</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lade Rechnungen...
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Rechnungen für die aktuellen Filter gefunden.</p>
            ) : (
              <div className="space-y-3">
                <div className="md:hidden space-y-3">
                  {pagedOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => openEditor(order.id)}
                      className={`w-full text-left rounded-lg border border-border bg-card p-3 space-y-2 ${DASHBOARD_ROW_HOVER_CLASS}`}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        openEditor(order.id);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Rechnung ${order.order_number || `#${order.id.slice(0, 8)}`} bearbeiten`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{order.order_number || `#${order.id.slice(0, 8)}`}</p>
                          <p className="text-[11px] text-muted-foreground font-mono break-all">{order.id}</p>
                        </div>
                        <span className={paymentStatusTone(order.payment_status)}>
                          {paymentStatusLabel(order.payment_status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        <div className="text-muted-foreground">
                          Datum: <span className="text-foreground">{formatOrderDate(order.opened_at)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Zahlungsart: <span className="text-foreground">{order.payment_method || "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="font-semibold text-foreground">{formatCurrency(order.total)}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleDownloadInvoice(order.id, order.order_number);
                          }}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Rechnung</th>
                        <th className="px-4 py-3 font-medium">Datum</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Zahlungsart</th>
                        <th className="px-4 py-3 font-medium text-right">Betrag</th>
                        <th className="px-4 py-3 font-medium text-right">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {pagedOrders.map((order) => (
                        <tr
                          key={order.id}
                          className={`cursor-pointer ${DASHBOARD_ROW_HOVER_CLASS}`}
                          onClick={() => openEditor(order.id)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            openEditor(order.id);
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Rechnung ${order.order_number || `#${order.id.slice(0, 8)}`} bearbeiten`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{order.order_number || `#${order.id.slice(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground font-mono">{order.id}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {formatOrderDate(order.opened_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={paymentStatusTone(order.payment_status)}>
                              {paymentStatusLabel(order.payment_status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{order.payment_method || "-"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleDownloadInvoice(order.id, order.order_number);
                                }}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                                PDF
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                  <div>
                    Zeigt {Math.min(pageStart + 1, filteredOrders.length)}-
                    {Math.min(pageStart + pageSize, filteredOrders.length)} von {filteredOrders.length} Einträgen
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safePage === 1}
                      className="bg-muted border-input text-foreground hover:bg-accent"
                    >
                      Zurück
                    </Button>
                    <span className="text-muted-foreground">
                      Seite {safePage} von {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safePage === totalPages}
                      className="bg-muted border-input text-foreground hover:bg-accent"
                    >
                      Weiter
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {restaurant ? (
        <OrderDetailDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedOrderId(null);
            }
          }}
          orderId={selectedOrderId}
          restaurantId={restaurant.id}
          onOrderUpdated={() => {
            void loadData(true);
          }}
          onNotify={(message, variant = "info") => notify(message, variant)}
          readOnly={false}
        />
      ) : null}

      {toasts.length > 0 ? (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium shadow-xl ${
                toast.variant === "success"
                  ? "bg-emerald-600 text-white"
                  : toast.variant === "error"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </FinanceModuleLayout>
  );
}
