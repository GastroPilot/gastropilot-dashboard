"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { ordersApi, Order, OrderStatus, OrderWithItems } from "@/lib/api/orders";
import { tablesApi, Table } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import { SkeletonOrderCard } from "@/components/skeletons";
import { OrderDialog } from "@/components/order-dialog";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  Plus,
  ShoppingCart,
  Filter,
  Search,
  Clock,
  Check,
  CheckCircle,
  XCircle,
  Euro,
  Table as TableIcon,
  ChevronDown,
} from "lucide-react";

const ALL_STATUSES: OrderStatus[] = [
  "open",
  "sent_to_kitchen",
  "in_preparation",
  "ready",
  "served",
  "paid",
  "canceled",
];
const STATUS_SETTINGS_KEY = "orders_status_filters";

const normalizeStatusList = (values: any): OrderStatus[] => {
  if (!Array.isArray(values)) return [];
  const unique = new Set<OrderStatus>();
  values.forEach((value) => {
    if (ALL_STATUSES.includes(value as OrderStatus)) {
      unique.add(value as OrderStatus);
    }
  });
  return Array.from(unique);
};

type StatusMeta = { Icon: typeof Clock; tone: string; label: string };

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  open: {
    Icon: Clock,
    tone: "bg-blue-900/40 border-blue-600 text-blue-100",
    label: "Offen",
  },
  sent_to_kitchen: {
    Icon: ShoppingCart,
    tone: "bg-indigo-900/40 border-indigo-600 text-indigo-100",
    label: "An Küche gesendet",
  },
  in_preparation: {
    Icon: Clock,
    tone: "bg-yellow-900/40 border-yellow-600 text-yellow-100",
    label: "In Zubereitung",
  },
  ready: {
    Icon: CheckCircle,
    tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100",
    label: "Fertig",
  },
  served: {
    Icon: CheckCircle,
    tone: "bg-green-900/40 border-green-600 text-green-100",
    label: "Serviert",
  },
  paid: {
    Icon: Euro,
    tone: "bg-amber-900/30 border-amber-600 text-amber-100",
    label: "Bezahlt",
  },
  canceled: {
    Icon: XCircle,
    tone: "bg-red-900/30 border-red-600 text-red-100",
    label: "Storniert",
  },
};

export default function OrdersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>(ALL_STATUSES);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  const { settings, updateSettings, error: settingsError } = useUserSettings();
  const settingsInitializedRef = useRef(false);
  const lastPersistedStatusesRef = useRef<string>("");
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const tableMenuRef = useRef<HTMLDivElement | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const restaurantsData = await restaurantsApi.list();
      
      if (restaurantsData.length === 0) {
        addToast("Kein Restaurant gefunden", "error");
        return;
      }

      const selectedRestaurant = restaurantsData[0];
      setRestaurant(selectedRestaurant);

      const [tablesData, ordersData] = await Promise.all([
        tablesApi.list(selectedRestaurant.id),
        ordersApi.list(selectedRestaurant.id),
      ]);

      setTables(tablesData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      addToast("Fehler beim Laden der Daten", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const refreshData = () => {
    loadData();
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) {
        setTableMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!settingsError) return;
    addToast(settingsError, "error");
  }, [settingsError, addToast]);

  useEffect(() => {
    if (settingsInitializedRef.current || !settings) return;
    const stored = (settings.settings || {})[STATUS_SETTINGS_KEY];
    if (Array.isArray(stored)) {
      const normalized = normalizeStatusList(stored);
      setSelectedStatuses(normalized);
      lastPersistedStatusesRef.current = JSON.stringify(normalized);
    } else {
      lastPersistedStatusesRef.current = JSON.stringify(selectedStatuses);
    }
    settingsInitializedRef.current = true;
  }, [settings, selectedStatuses]);

  const persistStatusFilter = useCallback(
    async (statuses: OrderStatus[]) => {
      const normalized = normalizeStatusList(statuses);
      const serialized = JSON.stringify(normalized);
      if (serialized === lastPersistedStatusesRef.current) return;
      lastPersistedStatusesRef.current = serialized;
      try {
        await updateSettings({ [STATUS_SETTINGS_KEY]: normalized });
      } catch (err) {
        console.error("Fehler beim Speichern der Bestellstatus-Filter:", err);
        addToast("Status-Filter konnten nicht gespeichert werden.", "error");
        lastPersistedStatusesRef.current = "";
      }
    },
    [updateSettings, addToast]
  );

  const filteredOrders = orders.filter((order) => {
    const statusesToUse = selectedStatuses.length ? selectedStatuses : ALL_STATUSES;
    if (!statusesToUse.includes(order.status)) return false;
    if (selectedTableId && order.table_id !== selectedTableId) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const orderNumber = order.order_number?.toLowerCase() || "";
      const table = tables.find((t) => t.id === order.table_id);
      const tableNumber = table?.number.toLowerCase() || "";
      return orderNumber.includes(query) || tableNumber.includes(query);
    }
    return true;
  });
  const hasActiveStatusFilter =
    selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length;

  const getTableName = (tableId: string | null) => {
    if (!tableId) return "Kein Tisch";
    const table = tables.find((t) => t.id === tableId);
    return table ? `${table.number}` : "Unbekannter Tisch";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (isLoading && !restaurant) {
    return (
      <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
        {/* Header Skeleton */}
        <div className="shrink-0 border-b border-border bg-card shadow-sm">
          <div className="px-4 py-3 h-28" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <SkeletonOrderCard count={12} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bestellmanagement</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Verwalten Sie Bestellungen und Abrechnungen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                variant="default"
                size="sm"
                className="touch-manipulation min-h-[32px] text-sm px-3"
                onClick={() => {
                  setSelectedTableForOrder(null);
                  setOrderDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Bestellung
              </Button>
            </div>
          </div>
        </div>

        {/* Filter und Suche */}
        <div className="mt-3 flex flex-col md:flex-row gap-3 px-4 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Nach Bestellnummer oder Tisch suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-input text-foreground placeholder-muted-foreground"
            />
          </div>

          <div className="relative" ref={tableMenuRef}>
            <button
              type="button"
              onClick={() => setTableMenuOpen((prev) => !prev)}
              className="w-full md:w-auto rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner flex items-center justify-between gap-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] touch-manipulation"
            >
              <div className="flex items-center gap-2 min-w-0">
                <TableIcon className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">
                  {selectedTableId ? getTableName(selectedTableId) : "Alle Tische"}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${tableMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {tableMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-lg border border-border bg-background shadow-xl z-[50] max-h-[70vh] overflow-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableId(null);
                    setTableMenuOpen(false);
                  }}
                  className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                    !selectedTableId
                      ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  Alle Tische
                  {!selectedTableId && <Check className="w-4 h-4 text-primary" />}
                </button>
                {[...tables]
                  .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
                  .map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => {
                        setSelectedTableId(table.id);
                        setTableMenuOpen(false);
                      }}
                      className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                        selectedTableId === table.id
                          ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      {table.number}
                      {selectedTableId === table.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="relative" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => setStatusMenuOpen((prev) => !prev)}
              className="w-full md:w-auto rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner flex items-center justify-between gap-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] touch-manipulation"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">
              {selectedStatuses.length === ALL_STATUSES.length || selectedStatuses.length === 0
                ? "Alle Status"
                : selectedStatuses.map((status) => STATUS_META[status].label).join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="px-2 py-1 rounded-md bg-muted text-xs">{filteredOrders.length}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {statusMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-lg border border-border bg-background shadow-xl z-[50] max-h-[70vh] overflow-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatuses((prev) => {
                      const next = prev.length === ALL_STATUSES.length ? [] : ALL_STATUSES;
                      void persistStatusFilter(next);
                      return next;
                    });
                  }}
                  className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                    selectedStatuses.length === ALL_STATUSES.length || selectedStatuses.length === 0
                      ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/10">
                      <Filter className="w-4 h-4" />
                    </span>
                    Alle Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-card">{orders.length}</span>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                        selectedStatuses.length === ALL_STATUSES.length || selectedStatuses.length === 0
                          ? "border-white/60 bg-white/10"
                          : "border-border bg-card"
                      }`}
                    >
                      {(selectedStatuses.length === ALL_STATUSES.length || selectedStatuses.length === 0) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </span>
                  </div>
                </button>
                {ALL_STATUSES.map((status) => {
                  const meta = STATUS_META[status];
                  const Icon = meta.Icon;
                  const count = orders.filter((order) => order.status === status).length;
                  const active = selectedStatuses.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setSelectedStatuses((prev) => {
                          const next = prev.includes(status)
                            ? prev.filter((entry) => entry !== status)
                            : [...prev, status];
                          const cleaned = next.length === 0 ? [] : next;
                          void persistStatusFilter(cleaned);
                          return cleaned;
                        });
                      }}
                      className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                        active
                          ? "font-semibold text-foreground border-l-2 border-primary bg-accent hover:bg-accent"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-md border shrink-0 ${
                            active ? meta.tone : "border-white/10 bg-black/10 text-foreground"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? "text-foreground dark:text-current" : ""}`} />
                        </span>
                        <span className="capitalize">{meta.label}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-card">{count}</span>
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                            active ? "border-white/60 bg-white/10" : "border-border bg-card"
                          }`}
                        >
                          {active && <Check className="w-4 h-4 text-primary" />}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bestellungen Liste */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground mb-2">
              Keine Bestellungen gefunden
            </h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || hasActiveStatusFilter
                ? "Versuchen Sie andere Suchkriterien"
                : "Erstellen Sie Ihre erste Bestellung"}
            </p>
            {!searchQuery && !hasActiveStatusFilter && (
              <Button
                className="bg-primary hover:bg-primary/90 text-foreground"
                onClick={() => {
                  setSelectedTableForOrder(null);
                  setOrderDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Bestellung erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const statusMeta = STATUS_META[order.status];
              const StatusIcon = statusMeta.Icon;
              return (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-input transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setOrderDetailDialogOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {order.order_number || `#${order.id}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TableIcon className="w-3 h-3" />
                        {getTableName(order.table_id)}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${statusMeta.tone}`}
                    >
                      <StatusIcon className="w-3 h-3 text-foreground dark:text-current" />
                      <span className="text-foreground dark:text-current">{statusMeta.label}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Eröffnet:</span>
                      <span className="text-muted-foreground">
                        {format(parseISO(order.opened_at), "dd.MM.yyyy HH:mm", {
                          locale: de,
                        })}
                      </span>
                    </div>
                    {order.party_size && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gäste:</span>
                        <span className="text-muted-foreground">{order.party_size}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Gesamt:</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          Zahlungsstatus:{" "}
                          <span
                            className={
                              order.payment_status === "paid"
                                ? "text-green-400"
                                : order.payment_status === "partial"
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                          >
                            {order.payment_status === "paid"
                              ? "Bezahlt"
                              : order.payment_status === "partial"
                              ? "Teilweise"
                              : "Offen"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                  : "bg-primary/90 border-primary text-foreground"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Order Dialog */}
      {restaurant && (
        <>
          <OrderDialog
            open={orderDialogOpen}
            onOpenChange={setOrderDialogOpen}
            restaurantId={restaurant.id}
            table={selectedTableForOrder}
            availableTables={tables}
            onOrderCreated={() => {
              refreshData();
              setOrderDialogOpen(false);
            }}
            onOrderUpdated={() => {
              refreshData();
              setOrderDialogOpen(false);
            }}
            onNotify={(message, variant) => addToast(message, variant)}
          />

          <OrderDetailDialog
            open={orderDetailDialogOpen}
            onOpenChange={setOrderDetailDialogOpen}
            restaurantId={restaurant.id}
            orderId={selectedOrderId}
            onOrderUpdated={() => {
              refreshData();
            }}
            onNotify={(message, variant) => addToast(message, variant)}
          />
        </>
      )}
    </div>
  );
}

