"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { ordersApi, Order, OrderStatus } from "@/lib/api/orders";
import { tablesApi, Table } from "@/lib/api/tables";
import { guestsApi, Guest } from "@/lib/api/guests";
import { LoadingOverlay } from "@/components/loading-overlay";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import {
  History,
  Calendar,
  Table as TableIcon,
  User,
  Download,
  Filter,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Euro,
  ChevronDown,
  Check,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { OrderWithItems } from "@/lib/api/orders";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const normalizeStatusList = (values: unknown): OrderStatus[] => {
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

export default function OrderHistoryPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>(ALL_STATUSES);
  const { settings, updateSettings } = useUserSettings();
  const settingsInitializedRef = useRef(false);
  const lastPersistedStatusesRef = useRef<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    tableId: number | null;
    guestId: number | null;
  }>({
    startDate: format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd"),
    endDate: format(endOfDay(new Date()), "yyyy-MM-dd"),
    tableId: null,
    guestId: null,
  });

  const loadData = useCallback(async () => {
    if (!restaurant) return;

    setIsLoading(true);
    try {
      const [ordersData, tablesData, guestsData] = await Promise.all([
        ordersApi.list(restaurant.id, {
          start_date: `${filters.startDate}T00:00:00Z`,
          end_date: `${filters.endDate}T23:59:59Z`,
          table_id: filters.tableId || undefined,
          guest_id: filters.guestId || undefined,
        }),
        tablesApi.list(restaurant.id),
        guestsApi.list(restaurant.id),
      ]);

      setOrders(ordersData);
      setTables(tablesData);
      setGuests(guestsData);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setIsLoading(false);
    }
  }, [restaurant, filters]);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const restaurants = await restaurantsApi.list();
        if (restaurants.length > 0) {
          setRestaurant(restaurants[0]);
        }
      } catch (error) {
        console.error("Fehler beim Laden des Restaurants:", error);
      }
    };

    loadRestaurant();
  }, []);

  useEffect(() => {
    if (restaurant) {
      loadData();
    }
  }, [restaurant, loadData]);

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
        lastPersistedStatusesRef.current = "";
      }
    },
    [updateSettings]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tableMenuRef.current && !tableMenuRef.current.contains(target)) {
        setTableMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleOrderClick = async (order: Order) => {
    if (!restaurant) return;
    try {
      const orderData = await ordersApi.get(restaurant.id, order.id);
      setSelectedOrder(orderData);
      setIsOrderDialogOpen(true);
    } catch (error) {
      console.error("Fehler beim Laden der Bestellung:", error);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const statusesToUse = selectedStatuses.length ? selectedStatuses : ALL_STATUSES;
    if (!statusesToUse.includes(order.status)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const orderNumber = order.order_number?.toLowerCase() || "";
    const tableNumber =
      tables.find((table) => table.id === order.table_id)?.number?.toLowerCase() || "";
    const guest = guests.find((g) => g.id === order.guest_id);
    const guestName = guest ? `${guest.first_name} ${guest.last_name}`.toLowerCase() : "";
    return (
      orderNumber.includes(query) ||
      tableNumber.includes(query) ||
      guestName.includes(query)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedOrders = filteredOrders.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedStatuses, searchQuery]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      "Bestellnummer",
      "Datum",
      "Tisch",
      "Gast",
      "Status",
      "Zahlungsstatus",
      "Zwischensumme",
      "MwSt.",
      "Rabatt",
      "Trinkgeld",
      "Gesamt",
      "Personen",
    ];

    const rows = filteredOrders.map((order) => {
      const table = tables.find((t) => t.id === order.table_id);
      const guest = guests.find((g) => g.id === order.guest_id);

      return [
        order.order_number || `#${order.id}`,
        format(parseISO(order.opened_at), "dd.MM.yyyy HH:mm", { locale: de }),
        table ? `Tisch ${table.number}` : "-",
        guest ? `${guest.first_name} ${guest.last_name}` : "-",
        order.status,
        order.payment_status,
        order.subtotal.toFixed(2),
        order.tax_amount.toFixed(2),
        order.discount_amount.toFixed(2),
        (order.tip_amount || 0).toFixed(2),
        order.total.toFixed(2),
        order.party_size || "-",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bestellhistorie_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };


  if (isLoading && !restaurant) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bestellhistorie</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Übersicht aller Bestellungen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredOrders.length === 0}
                className="bg-muted border-input text-foreground shadow-none hover:bg-muted hover:text-foreground hover:border-input hover:shadow-none"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV exportieren
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-6">
          <Card className="relative z-30 border-border bg-card/50 backdrop-blur-sm overflow-visible">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Filter className="w-5 h-5 text-primary" />
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-6 overflow-visible">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    Datum von
                  </label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    Datum bis
                  </label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2 relative z-[60]" ref={tableMenuRef}>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TableIcon className="w-4 h-4 text-primary" />
                    Tischnummer
                  </label>
                  <button
                    type="button"
                    onClick={() => setTableMenuOpen((prev) => !prev)}
                    className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card/50 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
                  >
                    <span className="truncate">
                      {filters.tableId
                        ? `${tables.find((t) => t.id === filters.tableId)?.number ?? "-"}`
                        : "Alle Tische"}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${tableMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {tableMenuOpen && (
                    <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-[80] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, tableId: null });
                          setTableMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors ${
                          !filters.tableId
                            ? "bg-card text-foreground font-semibold"
                            : "text-foreground hover:bg-accent/70"
                        }`}
                      >
                        <span className="truncate">Alle Tische</span>
                        {!filters.tableId && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      {[...tables]
                        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
                        .map((table) => {
                          const isSelected = filters.tableId === table.id;
                          return (
                            <button
                              key={table.id}
                              type="button"
                              onClick={() => {
                                setFilters({ ...filters, tableId: table.id });
                                setTableMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors ${
                                isSelected
                                  ? "bg-card text-foreground font-semibold"
                                  : "text-foreground hover:bg-accent/70"
                              }`}
                            >
                              <span className="truncate">{table.number}</span>
                              {isSelected && <Check className="w-4 h-4 text-primary" />}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
                <div className="space-y-2 relative z-[60]" ref={statusMenuRef}>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="w-4 h-4 text-primary" />
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setStatusMenuOpen((prev) => !prev)}
                    className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card/50 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
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
                    <div className="absolute mt-1 w-64 rounded-lg border border-border bg-background shadow-xl z-[80] max-h-[70vh] overflow-auto">
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
                            : "text-foreground hover:bg-card"
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
                                ? "font-semibold text-foreground border-l-2 border-primary bg-accent hover:bg-muted/80"
                                : "text-foreground hover:bg-card"
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
                            <span className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs bg-card">{count}</span>
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                                  active ? "border-white/60 bg-white/10" : "border-border bg-card"
                                }`}
                              >
                                {active && <Check className="w-4 h-4 text-primary" />}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Search className="w-4 h-4 text-primary" />
                    Suche
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Bestellnummer, Tisch oder Gast suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-card/50 border-input text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Bestellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <History className="w-16 h-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                    Keine Bestellungen gefunden
                  </h2>
                  <p className="text-muted-foreground">Passen Sie die Filter an oder wählen Sie einen anderen Zeitraum</p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    {pagedOrders.map((order) => {
                    const table = tables.find((t) => t.id === order.table_id);
                    const guest = guests.find((g) => g.id === order.guest_id);

                    return (
                      <div
                        key={order.id}
                        onClick={() => handleOrderClick(order)}
                        className="bg-card border border-border rounded-lg p-4 hover:border-input transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-semibold text-foreground">
                                {order.order_number || `#${order.id}`}
                              </div>
                              {table && (
                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <TableIcon className="w-4 h-4" />
                                  {table.number}
                                </div>
                              )}
                              {guest && (
                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <User className="w-4 h-4" />
                                  {guest.first_name} {guest.last_name}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(order.opened_at), "dd.MM.yyyy HH:mm", { locale: de })}
                              </div>
                              <div>
                                Status: <span className="text-muted-foreground">{order.status}</span>
                              </div>
                              <div>
                                Zahlung:{" "}
                                <span
                                  className={
                                    order.payment_status === "paid"
                                      ? "text-green-400"
                                      : order.payment_status === "partial"
                                      ? "text-yellow-400"
                                      : "text-red-400"
                                  }
                                >
                                  {order.payment_status}
                                </span>
                              </div>
                              {order.party_size && (
                                <div>{order.party_size} Personen</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-foreground mb-1">
                              {formatCurrency(order.total)}
                            </div>
                            {order.discount_amount > 0 && (
                              <div className="text-xs text-red-400">
                                Rabatt: {formatCurrency(order.discount_amount)}
                              </div>
                            )}
                            {order.tip_amount > 0 && (
                              <div className="text-xs text-green-400">
                                Trinkgeld: {formatCurrency(order.tip_amount)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
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
      </div>

      {/* Order Detail Dialog */}
      {selectedOrder && restaurant && (
        <OrderDetailDialog
          open={isOrderDialogOpen}
          onOpenChange={setIsOrderDialogOpen}
          orderId={selectedOrder.id}
          restaurantId={restaurant.id}
          onOrderUpdated={loadData}
        />
      )}
    </div>
  );
}

