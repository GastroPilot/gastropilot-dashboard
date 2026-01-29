"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { ordersApi, OrderWithItems, OrderStatus } from "@/lib/api/orders";
import { tablesApi, Table } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/loading-overlay";
import { parseISO } from "date-fns";
import {
  Clock,
  ChefHat,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Table as TableIcon,
} from "lucide-react";

type KitchenStatus = "sent_to_kitchen" | "in_preparation" | "ready";

interface KitchenOrder extends OrderWithItems {
  table?: Table;
}

export default function KitchenPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for values used in loadData callback to avoid stale closures
  const soundEnabledRef = useRef(soundEnabled);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const lastOrderCountRef = useRef(lastOrderCount);

  // Keep refs in sync with state
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);
  useEffect(() => { lastOrderCountRef.current = lastOrderCount; }, [lastOrderCount]);

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const loadData = useCallback(async (background = false) => {
    try {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const restaurantsData = await restaurantsApi.list();
      if (restaurantsData.length === 0) {
        addToast("Kein Restaurant gefunden", "error");
        return;
      }

      const selectedRestaurant = restaurantsData[0];
      setRestaurant(selectedRestaurant);

      // Lade nur Bestellungen mit relevanten Küchen-Status
      const kitchenStatuses: OrderStatus[] = ["sent_to_kitchen", "in_preparation", "ready"];
      const [tablesData, ordersData] = await Promise.all([
        tablesApi.list(selectedRestaurant.id),
        Promise.all(
          kitchenStatuses.map((status) =>
            ordersApi.list(selectedRestaurant.id, { status }).catch(() => [])
          )
        ).then((results) => results.flat()),
      ]);

      setTables(tablesData);

      // Lade Items für jede Bestellung
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          try {
            const fullOrder = await ordersApi.get(selectedRestaurant.id, order.id);
            return fullOrder;
          } catch (error) {
            console.error(`Fehler beim Laden der Bestellung ${order.id}:`, error);
            return { ...order, items: [] };
          }
        })
      );

      // Enrich orders with table information
      const enrichedOrders: KitchenOrder[] = ordersWithItems.map((order) => ({
        ...order,
        items: order.items || [],
        table: order.table_id
          ? tablesData.find((t) => t.id === order.table_id)
          : undefined,
      }));

      // Sortiere nach opened_at (älteste zuerst)
      enrichedOrders.sort(
        (a, b) =>
          new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
      );

      // Benachrichtigungen für neue Bestellungen
      if (background && lastOrderCountRef.current > 0) {
        const newOrderCount = enrichedOrders.filter(
          (o) => o.status === "sent_to_kitchen"
        ).length;
        if (newOrderCount > lastOrderCountRef.current) {
          // Neue Bestellung erhalten
          if (soundEnabledRef.current) {
            playNotificationSound();
          }
          if (notificationsEnabledRef.current && "Notification" in window && Notification.permission === "granted") {
            new Notification("Neue Bestellung", {
              body: `${newOrderCount - lastOrderCountRef.current} neue Bestellung(en) erhalten`,
              icon: "/favicon.ico",
            });
          }
        }
      }
      setLastOrderCount(
        enrichedOrders.filter((o) => o.status === "sent_to_kitchen").length
      );

      setOrders(enrichedOrders);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      if (!background) {
        addToast("Fehler beim Laden der Daten", "error");
      }
    } finally {
      if (background) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [addToast]);

  const playNotificationSound = () => {
    if (typeof window !== "undefined" && !audioRef.current) {
      // Erstelle Audio-Element für Notification-Sound
      audioRef.current = new Audio();
      // Verwende einen einfachen Beep-Ton (kann durch eine echte Sound-Datei ersetzt werden)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  useEffect(() => {
    // Browser-Benachrichtigungen anfragen
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadData(false);

    // Auto-Refresh alle 10 Sekunden
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        loadData(true);
      }, 10000);
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, loadData]);

  const handleStatusChange = async (orderId: number, newStatus: KitchenStatus) => {
    if (!restaurant) return;

    try {
      await ordersApi.update(restaurant.id, orderId, { status: newStatus });
      
      const statusLabels: Record<KitchenStatus, string> = {
        sent_to_kitchen: "An Küche gesendet",
        in_preparation: "In Zubereitung",
        ready: "Fertig",
      };
      
      addToast(`Status geändert: ${statusLabels[newStatus]}`, "success");
      await loadData(true);
    } catch (error) {
      console.error("Fehler beim Ändern des Status:", error);
      addToast("Fehler beim Ändern des Status", "error");
    }
  };

  const groupedOrders = {
    sent_to_kitchen: orders.filter((o) => o.status === "sent_to_kitchen"),
    in_preparation: orders.filter((o) => o.status === "in_preparation"),
    ready: orders.filter((o) => o.status === "ready"),
  };

  const getStatusColor = (status: KitchenStatus) => {
    switch (status) {
      case "sent_to_kitchen":
        return "bg-blue-900/40 border-blue-600 text-blue-100";
      case "in_preparation":
        return "bg-yellow-900/40 border-yellow-600 text-yellow-100";
      case "ready":
        return "bg-green-900/40 border-green-600 text-green-100";
    }
  };

  const getStatusLabel = (status: KitchenStatus) => {
    switch (status) {
      case "sent_to_kitchen":
        return "Neu";
      case "in_preparation":
        return "In Zubereitung";
      case "ready":
        return "Fertig";
    }
  };

  if (isLoading && !restaurant) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-700 bg-gray-800 shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Küchen-Ansicht</h1>
                <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                  Verwalten Sie Bestellungen in der Küche
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="bg-gray-700 border-gray-600 text-gray-200 shadow-none hover:text-blue-100 hover:border-blue-500 hover:shadow-[0_12px_32px_rgba(37,99,235,0.25)]"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Aktualisieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={
                  autoRefresh
                    ? "bg-green-900/30 border-green-600 text-green-200 shadow-none hover:bg-green-900/50 hover:text-green-100 hover:border-green-500 hover:shadow-[0_12px_32px_rgba(34,197,94,0.25)]"
                    : "bg-gray-700 border-gray-600 text-gray-200 shadow-none hover:text-blue-100 hover:border-blue-500 hover:shadow-[0_12px_32px_rgba(37,99,235,0.25)]"
                }
              >
                {autoRefresh ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Auto-Refresh: An
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Auto-Refresh: Aus
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!soundEnabled && "Notification" in window && Notification.permission !== "granted") {
                    Notification.requestPermission();
                  }
                  setSoundEnabled(!soundEnabled);
                }}
                className={
                  soundEnabled
                    ? "bg-blue-900/30 border-blue-600 text-blue-200 shadow-none hover:bg-blue-900/50 hover:text-blue-100 hover:border-blue-500 hover:shadow-[0_12px_32px_rgba(37,99,235,0.25)]"
                    : "bg-gray-700 border-gray-600 text-gray-200 shadow-none hover:text-blue-100 hover:border-blue-500 hover:shadow-[0_12px_32px_rgba(37,99,235,0.25)]"
                }
              >
                🔊 {soundEnabled ? "Sound: An" : "Sound: Aus"}
              </Button>
              {typeof window !== "undefined" && "Notification" in window && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!notificationsEnabled && Notification.permission !== "granted") {
                      const permission = await Notification.requestPermission();
                      if (permission === "granted") {
                        setNotificationsEnabled(true);
                      }
                    } else {
                      setNotificationsEnabled(!notificationsEnabled);
                    }
                  }}
                  className={
                    notificationsEnabled
                      ? "bg-purple-900/30 border-purple-600 text-purple-200 shadow-none hover:bg-purple-900/50 hover:text-purple-100 hover:border-purple-500 hover:shadow-[0_12px_32px_rgba(168,85,247,0.25)]"
                      : "bg-gray-700 border-gray-600 text-gray-200 shadow-none hover:text-blue-100 hover:border-blue-500 hover:shadow-[0_12px_32px_rgba(37,99,235,0.25)]"
                  }
                >
                  🔔{" "}
                  {notificationsEnabled
                    ? "Benachrichtigungen: An"
                    : Notification.permission === "granted"
                    ? "Benachrichtigungen: Aus"
                    : "Benachrichtigungen aktivieren"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ChefHat className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Keine offenen Bestellungen
            </h2>
            <p className="text-gray-500">Alle Bestellungen sind abgearbeitet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Neue Bestellungen */}
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-gray-900 pb-2">
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  Neue Bestellungen
                </h2>
                <div className="text-sm text-gray-400">
                  {groupedOrders.sent_to_kitchen.length} Bestellung
                  {groupedOrders.sent_to_kitchen.length !== 1 ? "en" : ""}
                </div>
              </div>
              <div className="space-y-3">
                {groupedOrders.sent_to_kitchen.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    canChangeTo={["in_preparation"]}
                  />
                ))}
                {groupedOrders.sent_to_kitchen.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-gray-700 rounded-lg">
                    Keine neuen Bestellungen
                  </div>
                )}
              </div>
            </div>

            {/* In Zubereitung */}
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-gray-900 pb-2">
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  In Zubereitung
                </h2>
                <div className="text-sm text-gray-400">
                  {groupedOrders.in_preparation.length} Bestellung
                  {groupedOrders.in_preparation.length !== 1 ? "en" : ""}
                </div>
              </div>
              <div className="space-y-3">
                {groupedOrders.in_preparation.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    canChangeTo={["ready"]}
                  />
                ))}
                {groupedOrders.in_preparation.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-gray-700 rounded-lg">
                    Keine Bestellungen in Zubereitung
                  </div>
                )}
              </div>
            </div>

            {/* Fertig */}
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-gray-900 pb-2">
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Fertig zur Abholung
                </h2>
                <div className="text-sm text-gray-400">
                  {groupedOrders.ready.length} Bestellung
                  {groupedOrders.ready.length !== 1 ? "en" : ""}
                </div>
              </div>
              <div className="space-y-3">
                {groupedOrders.ready.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    canChangeTo={[]}
                  />
                ))}
                {groupedOrders.ready.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-gray-700 rounded-lg">
                    Keine fertigen Bestellungen
                  </div>
                )}
              </div>
            </div>
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

interface OrderCardProps {
  order: KitchenOrder;
  onStatusChange: (orderId: number, status: KitchenStatus) => void;
  canChangeTo: KitchenStatus[];
}

function OrderCard({ order, onStatusChange, canChangeTo }: OrderCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getTimeAgo = (dateString: string) => {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "gerade eben";
    if (diffMins === 1) return "vor 1 Minute";
    if (diffMins < 60) return `vor ${diffMins} Minuten`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "vor 1 Stunde";
    return `vor ${diffHours} Stunden`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {order.table && (
              <>
                <TableIcon className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-white">Tisch {order.table.number}</span>
              </>
            )}
            {!order.table && (
              <span className="font-semibold text-white">#{order.order_number || order.id}</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {getTimeAgo(order.opened_at)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {formatCurrency(order.total)}
          </div>
          {order.party_size && (
            <div className="text-xs text-gray-400">{order.party_size} Pers.</div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3 border-t border-gray-700 pt-3">
        {(order.items || []).map((item) => (
          <div key={item.id} className="flex items-start justify-between text-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-medium">{item.quantity}x</span>
                <span className="text-gray-200">{item.item_name}</span>
              </div>
              {item.notes && (
                <div className="text-xs text-yellow-400 mt-1 ml-6">
                  💬 {item.notes}
                </div>
              )}
            </div>
            <span className="text-gray-400">
              {formatCurrency(item.total_price)}
            </span>
          </div>
        ))}
      </div>

      {/* Special Requests */}
      {order.special_requests && (
        <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200">
          <strong>Hinweis:</strong> {order.special_requests}
        </div>
      )}

      {/* Actions */}
      {canChangeTo.length > 0 && (
        <div className="flex gap-2 pt-3 border-t border-gray-700">
          {canChangeTo.map((status) => (
            <Button
              key={status}
              size="sm"
              onClick={() => onStatusChange(order.id, status)}
              className={
                status === "in_preparation"
                  ? "bg-yellow-600 text-white border border-yellow-600 shadow-none hover:bg-yellow-600 hover:border-yellow-600 hover:shadow-[0_12px_32px_rgba(234,179,8,0.35)] flex-1"
                  : status === "ready"
                  ? "bg-green-600 text-white border border-green-600 shadow-none hover:bg-green-600 hover:border-green-600 hover:shadow-[0_12px_32px_rgba(34,197,94,0.35)] flex-1"
                  : "bg-gray-700 text-gray-200 border border-gray-600 shadow-none hover:bg-gray-700 hover:border-gray-500 hover:text-gray-100 flex-1"
              }
            >
              {status === "in_preparation" && "In Zubereitung"}
              {status === "ready" && "Fertig"}
            </Button>
          ))}
        </div>
      )}

      {/* Ready Badge */}
      {order.status === "ready" && (
        <div className="pt-3 border-t border-gray-700">
          <div className="text-center text-sm font-medium text-green-400">
            ✓ Bereit zur Abholung
          </div>
        </div>
      )}
    </div>
  );
}

