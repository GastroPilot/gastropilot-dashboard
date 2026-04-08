"use client";

import { useEffect, useState, useMemo, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { Table } from "@/lib/api/tables";
import { Reservation } from "@/lib/api/reservations";
import { Order } from "@/lib/api/orders";
import { Obstacle } from "@/lib/api/obstacles";
import { Area } from "@/lib/api/areas";
import { authApi } from "@/lib/api/auth";
import { impersonation } from "@/lib/api/admin";
import { TableDayConfig } from "@/lib/api/table-day-configs";
import { ReservationTableDayConfig } from "@/lib/api/reservation-table-day-configs";
import { Block } from "@/lib/api/blocks";
import { BlockAssignment } from "@/lib/api/block-assignments";
import { dashboardApi } from "@/lib/api/dashboard";
import { TableCard } from "@/components/table-card";
import { ReservationCard } from "@/components/reservation-card";
import { BlockCard } from "@/components/block-card";
import { WaitlistSidebar } from "@/components/waitlist-sidebar";
import { ReservationDialog } from "@/components/reservation-dialog";
import { TableDetailsDialog } from "@/components/table-details-dialog";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { SkeletonTableCard } from "@/components/skeletons";
import { AreaSelector } from "@/components/area-selector";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { useDashboardComputations } from "@/lib/hooks/use-dashboard-computations";
import { Plus, ChevronLeft, ChevronRight, LayoutGrid, MoveRight, ShieldAlert, ZoomIn, ZoomOut, Maximize2, Clock, ShieldCheck, Calendar } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

const DASHBOARD_ZOOM_SETTINGS_KEY = "dashboard_zoom_level";

// ============================================
// OPTIMIERTE HOOKS
// ============================================

/**
 * Optimierte Uhr - aktualisiert alle 10 Sekunden statt jede Sekunde
 */
function useOptimizedClock(updateInterval = 10000) {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    // Initiale Aktualisierung
    setNow(new Date());
    
    const interval = setInterval(() => {
      setNow(new Date());
    }, updateInterval);
    
    return () => clearInterval(interval);
  }, [updateInterval]);
  
  return now;
}

/**
 * Hook für Batch-API-Aufrufe mit Caching
 */
function useDashboardData(restaurantId: string | null, selectedDate: Date) {
  const [data, setData] = useState<{
    restaurant: Restaurant | null;
    areas: Area[];
    tables: Table[];
    obstacles: Obstacle[];
    reservations: Reservation[];
    blocks: Block[];
    blockAssignments: BlockAssignment[];
    orders: Order[];
    tableDayConfigs: TableDayConfig[];
    reservationTableDayConfigs: ReservationTableDayConfig[];
  }>({
    restaurant: null,
    areas: [],
    tables: [],
    obstacles: [],
    reservations: [],
    blocks: [],
    blockAssignments: [],
    orders: [],
    tableDayConfigs: [],
    reservationTableDayConfigs: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Cache-Key für Deduplizierung
  const lastFetchKeyRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchData = useCallback(async (restId: string, date: Date, background = false) => {
    const cacheKey = `${restId}-${format(date, 'yyyy-MM-dd')}`;
    
    // Skip duplicate requests
    if (background && lastFetchKeyRef.current === cacheKey) {
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    if (!background) {
      setIsLoading(true);
    }
    
    try {
      // Single batch request instead of 10+ individual requests
      const batchData = await dashboardApi.getDashboardData(restId, date);
      
      lastFetchKeyRef.current = cacheKey;
      
      // Process table day configs to apply to tables
      const configMap = new Map<string, TableDayConfig>();
      const tempConfigMap = new Map<string, TableDayConfig>();
      
      (batchData.table_day_configs || []).forEach((config: any) => {
        if (config.table_id !== null && config.table_id !== undefined) {
          configMap.set(config.table_id, config);
        } else if (config.is_temporary && config.number) {
          tempConfigMap.set(config.number, config);
        }
      });
      
      // Apply day configs to tables
      const visibleTables: Table[] = [];
      const tablesData = batchData.tables || [];
      
      tablesData.forEach((table: any) => {
        const config = configMap.get(table.id);
        
        if (config?.is_hidden) {
          return;
        }
        
        if (!config) {
          visibleTables.push(table as Table);
          return;
        }
        
        visibleTables.push({
          ...table,
          // Keep canonical coordinates from base table data so /dashboard and /dashboard/tables stay in sync.
          position_x: table.position_x,
          position_y: table.position_y,
          width: config.width ?? table.width,
          height: config.height ?? table.height,
          is_active: config.is_active ?? table.is_active,
          color: config.color ?? table.color,
          join_group_id: config.join_group_id,
          is_joinable: config.is_joinable ?? table.is_joinable,
          rotation: config.rotation ?? table.rotation,
        } as Table);
      });
      
      // Add temporary tables
      tempConfigMap.forEach(config => {
        if (!config.is_hidden && config.number && config.capacity) {
          const tempTable: Table = {
            id: `temp-${config.id}`,
            restaurant_id: config.restaurant_id ?? restId,
            number: config.number,
            capacity: config.capacity,
            shape: config.shape ?? "rectangle",
            position_x: config.position_x ?? 50,
            position_y: config.position_y ?? 50,
            width: config.width ?? 120,
            height: config.height ?? 120,
            is_active: config.is_active ?? true,
            notes: config.notes ?? null,
            color: config.color ?? null,
            is_joinable: config.is_joinable ?? false,
            join_group_id: config.join_group_id ?? null,
            is_outdoor: false,
            rotation: config.rotation ?? null,
            created_at_utc: config.created_at_utc ?? new Date().toISOString(),
            updated_at_utc: config.updated_at_utc ?? new Date().toISOString(),
            area_id: null,
          };
          visibleTables.push(tempTable);
        }
      });
      
      // Filter active orders
      const activeOrders = (batchData.orders || []).filter(
        (o: any) => o.status !== "paid" && o.status !== "canceled"
      );
      
      setData({
        restaurant: batchData.restaurant as Restaurant,
        areas: batchData.areas as Area[],
        tables: visibleTables,
        obstacles: batchData.obstacles as Obstacle[],
        reservations: batchData.reservations as Reservation[],
        blocks: batchData.blocks as Block[],
        blockAssignments: batchData.block_assignments as BlockAssignment[],
        orders: activeOrders as Order[],
        tableDayConfigs: batchData.table_day_configs as TableDayConfig[],
        reservationTableDayConfigs: batchData.reservation_table_day_configs as ReservationTableDayConfig[],
      });
      
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error("Fehler beim Laden der Dashboard-Daten:", err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    if (restaurantId) {
      fetchData(restaurantId, selectedDate);
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps -- Only on restaurantId change
  
  // Date change - background refresh
  useEffect(() => {
    if (restaurantId && !isLoading) {
      lastFetchKeyRef.current = ""; // Force refresh
      fetchData(restaurantId, selectedDate, true);
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep dashboard data fresh so kitchen updates from other devices become visible.
  useEffect(() => {
    if (!restaurantId) return;

    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      lastFetchKeyRef.current = ""; // Force refresh
      fetchData(restaurantId, selectedDate, true);
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [restaurantId, selectedDate, fetchData]);
  
  const refresh = useCallback((background = false) => {
    if (restaurantId) {
      lastFetchKeyRef.current = ""; // Force refresh
      fetchData(restaurantId, selectedDate, background);
    }
  }, [restaurantId, selectedDate, fetchData]);
  
  return { ...data, isLoading, error, refresh };
}

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function DashboardPage() {
  // ============================================
  // STATE - Reduziert auf das Wesentliche
  // ============================================
  
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // UI State
  // Dialog State
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [tableDetailsOpen, setTableDetailsOpen] = useState(false);
  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState(false);
  
  // Selection State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const activeId: string | null = null;
  const activeReservationId: string | null = null;
  const activeBlockId: string | null = null;
  
  // UI Controls
  const [waitlistSearchQuery, setWaitlistSearchQuery] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const tablePlanRef = useRef<HTMLDivElement | null>(null);
  
  // Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);
  
  // Settings
  const { settings, updateSettings, error: settingsError } = useUserSettings();
  const settingsInitializedRef = useRef(false);
  const lastPersistedZoomRef = useRef<string>("");
  const zoomSaveTimeoutRef = useRef<number | null>(null);
  
  // Refs für Pan/Zoom
  const panRef = useRef({ isPanning: false, startX: 0, startY: 0 });
  const zoomRef = useRef({ initialDistance: 0, initialZoom: 1 });
  const panRafRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  // ============================================
  // OPTIMIERTE HOOKS
  // ============================================
  
  // Optimierte Uhr (alle 10s statt jede Sekunde)
  const now = useOptimizedClock(10000);
  
  // Batch-Daten laden
  const {
    restaurant,
    areas,
    tables: allTables,
    obstacles: allObstacles,
    reservations,
    blocks,
    blockAssignments,
    orders,
    reservationTableDayConfigs,
    isLoading: isInitialLoading,
    refresh: refreshData,
  } = useDashboardData(restaurantId, selectedDate);
  
  // Reservation to temp table mapping
  const reservationToTempTableMap = useMemo(() => {
    const mapping = new Map<string, string>();
    reservationTableDayConfigs.forEach(rtdc => {
      const tempTable = allTables.find(t => t.id === `temp-${rtdc.table_day_config_id}`);
      if (tempTable) {
        mapping.set(rtdc.reservation_id, tempTable.id);
      }
    });
    return mapping;
  }, [reservationTableDayConfigs, allTables]);
  
  // Filter by area
  const filterByArea = useCallback(<T extends { area_id?: string | null }>(items: T[], areaId: string | null) => {
    if (!areaId) return items;
    return items.filter((item) => (item.area_id ?? null) === areaId);
  }, []);
  
  // Gefilterte Daten nach Area
  const tables = useMemo(
    () =>
      allTables.filter((table) => {
        if (!selectedAreaId) return true;
        // Temp-Tische haben keine area_id und sollen trotzdem sichtbar bleiben.
        if (String(table.id).startsWith("temp-")) return true;
        return (table.area_id ?? null) === selectedAreaId;
      }),
    [allTables, selectedAreaId]
  );
  const obstacles = useMemo(() => filterByArea(allObstacles, selectedAreaId), [allObstacles, selectedAreaId, filterByArea]);
  
  // Alle Berechnungen gecached
  const computations = useDashboardComputations({
    reservations,
    blocks,
    blockAssignments,
    tables: allTables,
    areas,
    orders,
    selectedDate,
    reservationToTempTableMap,
  });
  
  const {
    waitlistReservations,
    blockTemplates,
    getTableReservations,
    getTableOrders,
    getBlockStatus,
    getTableName,
    getReservationTableLabel,
    getReservationAreaLabel,
    getBlockTableLabels,
  } = computations;

  // ============================================
  // DND SENSORS
  // ============================================
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 5,
        delay: 100,
        tolerance: 10,
      },
    })
  );

  // ============================================
  // CALLBACKS
  // ============================================
  
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
  
  // Initial Restaurant Load
  useEffect(() => {
    async function loadRestaurant() {
      try {
        // Grundstatus: platform_admin ohne Impersonation → kein Tenant-Kontext
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
        if (user.role === "platform_admin" && !impersonation.isActive()) {
          return; // restaurantId bleibt null → Grundstatus-Screen wird gezeigt
        }
        const restaurants = await restaurantsApi.list();
        if (restaurants.length > 0) {
          setRestaurantId(restaurants[0].id);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Restaurants:", error);
      } finally {
        setRestaurantsLoaded(true);
      }
    }
    loadRestaurant();
  }, []);
  
  // Load current user
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Fehler beim Laden des aktuellen Users:", err);
      }
    }
    loadCurrentUser();
  }, []);
  
  // Set initial area when areas load
  useEffect(() => {
    if (areas.length > 0 && !selectedAreaId) {
      setSelectedAreaId(areas[0].id);
    } else if (areas.length > 0 && selectedAreaId && !areas.some(a => a.id === selectedAreaId)) {
      setSelectedAreaId(areas[0].id);
    } else if (areas.length === 0) {
      setSelectedAreaId(null);
    }
  }, [areas, selectedAreaId]);
  
  // Settings error toast
  useEffect(() => {
    if (settingsError) {
      addToast(settingsError, "error");
    }
  }, [settingsError, addToast]);
  
  // Zoom settings persistence
  useEffect(() => {
    if (settingsInitializedRef.current || !settings) return;
    const stored = (settings.settings || {})[DASHBOARD_ZOOM_SETTINGS_KEY];
    const storedNumber = typeof stored === "number" ? stored : Number(stored);
    if (Number.isFinite(storedNumber)) {
      const clamped = Math.min(3, Math.max(0.5, storedNumber));
      setZoomLevel(clamped);
      lastPersistedZoomRef.current = clamped.toString();
    } else {
      lastPersistedZoomRef.current = zoomLevel.toString();
    }
    settingsInitializedRef.current = true;
  }, [settings, zoomLevel]);
  
  useEffect(() => {
    if (!settingsInitializedRef.current || !settings) return;
    const rounded = Number(zoomLevel.toFixed(2));
    const serialized = rounded.toString();
    if (serialized === lastPersistedZoomRef.current) return;
    lastPersistedZoomRef.current = serialized;
    if (zoomSaveTimeoutRef.current !== null) {
      window.clearTimeout(zoomSaveTimeoutRef.current);
    }
    zoomSaveTimeoutRef.current = window.setTimeout(() => {
      updateSettings({ [DASHBOARD_ZOOM_SETTINGS_KEY]: rounded }).catch((err) => {
        console.error("Fehler beim Speichern des Zoom-Levels:", err);
        addToast("Zoom-Einstellung konnte nicht gespeichert werden.", "error");
        lastPersistedZoomRef.current = "";
      });
    }, 300);
    return () => {
      if (zoomSaveTimeoutRef.current !== null) {
        window.clearTimeout(zoomSaveTimeoutRef.current);
        zoomSaveTimeoutRef.current = null;
      }
    };
  }, [zoomLevel, settings, updateSettings, addToast]);
  
  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
    };
  }, []);
  
  // ============================================
  // ZOOM HANDLERS
  // ============================================
  
  const handleZoomIn = useCallback(() => {
    setIsZooming(true);
    setZoomLevel(prev => {
      const newZoom = Math.min(prev * 1.2, 3);
      setTimeout(() => setIsZooming(false), 150);
      return newZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setIsZooming(true);
    setZoomLevel(prev => {
      const newZoom = Math.max(prev / 1.2, 0.5);
      setTimeout(() => setIsZooming(false), 150);
      return newZoom;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // ============================================
  // DATE NAVIGATION
  // ============================================
  
  const navigateDate = useCallback((days: number) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  }, []);

  // ============================================
  // TABLE / RESERVATION HANDLERS
  // ============================================

  const handleTableClick = useCallback((table: Table) => {
    setSelectedTable(table);
    setSelectedReservation(null);
    setTableDetailsOpen(true);
  }, []);

  const handleReservationClick = useCallback((reservation: Reservation, table?: Table) => {
    setSelectedReservation(reservation);
    setSelectedTable(table || tables.find((t) => t.id === reservation.table_id) || null);
    setReservationDialogOpen(true);
  }, [tables]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getObstacleLabel = useCallback((type: string) => {
    switch (type) {
      case "door": return "Tür";
      case "stairs": return "Treppe";
      case "kitchen": return "Küche";
      case "bar": return "Bar";
      case "wall": return "Wand";
      case "other": return "Sonstiges";
      default: return type;
    }
  }, []);

  // ============================================
  // RENDER
  // ============================================

  // Warte bis die Restaurant-Liste geladen wurde
  if (!restaurantsLoaded) {
    return <LoadingOverlay />;
  }

  // Kein Restaurant gefunden
  if (!restaurantId) {
    const isGrundstatus = currentUser?.role === "platform_admin";
    return (
      <div className="p-6 bg-background h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          {isGrundstatus ? (
            <>
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Kein Tenant ausgewählt</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Du befindest dich im Grundstatus als Plattform-Admin. Wähle einen Tenant aus, um das Dashboard zu nutzen.
              </p>
              <Link
                href="/dashboard/restaurants"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Zur Tenant-Verwaltung
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-4">Kein Restaurant gefunden</h2>
              <p className="text-muted-foreground mb-6">
                Bitte erstelle zuerst ein Restaurant, um das Dashboard nutzen zu können.
              </p>
              <Link
                href="/dashboard/restaurants/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Restaurant erstellen
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // Restaurant-Daten werden geladen
  if (isInitialLoading) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Header Skeleton */}
        <div className="bg-card border-b border-border shadow-sm shrink-0">
          <div className="px-4 py-3 h-20" />
        </div>

        {/* Content with Skeleton */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full relative overflow-hidden bg-background flex">
            {/* Sidebar Skeleton */}
            <div className="w-80 bg-card border-r border-border" />

            {/* Table Plan Skeleton */}
            <div className="flex-1 relative p-8">
              <div
                className="grid gap-6 justify-items-center"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, 120px)",
                  gridAutoRows: "120px"
                }}
              >
                <SkeletonTableCard count={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback falls restaurant Daten nicht geladen werden konnten
  if (!restaurant) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <p className="text-muted-foreground">Fehler beim Laden des Restaurants. Bitte versuche es erneut.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-lg text-sm ${
                toast.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-card border-border text-foreground"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="relative px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 backdrop-blur-sm min-h-[32px] md:min-h-[36px]">
                <button
                  type="button"
                  aria-current="page"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm md:text-base font-semibold border border-primary/80 shadow-inner min-h-[32px] md:min-h-[36px]"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Tischplan
                </button>
                <Link
                  href="/dashboard/timeline"
                  aria-label="Zeitplan"
                  title="Zeitplan"
                  className="inline-flex items-center justify-center px-3 py-1 rounded-md text-foreground border border-transparent hover:bg-accent min-h-[32px] md:min-h-[36px]"
                >
                  <Clock className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard/reservations"
                  aria-label="Reservierungen"
                  title="Reservierungen"
                  className="inline-flex items-center justify-center px-3 py-1 rounded-md text-foreground border border-transparent hover:bg-accent min-h-[32px] md:min-h-[36px]"
                >
                  <Calendar className="w-4 h-4" />
                </Link>
              </div>
              <div className="text-left ml-2 md:ml-4 border-l border-input pl-2 md:pl-4">
                <div className="text-xs md:text-sm font-semibold text-foreground whitespace-nowrap">
                  {format(now, "EEEE, d. MMMM yyyy", { locale: de })}
                </div>
                <div className="text-base md:text-lg lg:text-xl font-bold text-primary tracking-tight whitespace-nowrap">
                  {format(now, "HH:mm")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0 shrink-0 justify-end">
              <div className="text-right leading-tight">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ausgewählter Tag</div>
                <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                  {format(selectedDate, "EEE, d.M.yyyy", { locale: de })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate(-1)}
                  className="touch-manipulation min-h-[32px] px-2 py-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="touch-manipulation min-h-[32px] text-xs px-2 py-1 gap-1.5"
                  title="Heute springen"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Heute
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate(1)}
                  className="touch-manipulation min-h-[32px] px-2 py-1"
                  title="Nächster Tag"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
        >
          <div className="h-full relative overflow-hidden bg-background flex">
            {/* Warteliste Sidebar */}
            <div
              className={`
                absolute md:relative z-[30] transition-[width] duration-300 ease-in-out
                ${sidebarOpen ? "w-72 md:w-80" : "w-14"}
                top-0 left-0
                h-full
              `}
            >
              <WaitlistSidebar
                reservations={waitlistReservations}
                blocks={blockTemplates}
                activeReservationId={activeReservationId}
                activeBlockId={activeBlockId}
                getTableName={getTableName}
                getReservationTableLabel={getReservationTableLabel}
                getReservationAreaLabel={getReservationAreaLabel}
                getBlockTableLabels={getBlockTableLabels}
                searchQuery={waitlistSearchQuery}
                onSearchChange={setWaitlistSearchQuery}
                onReservationClick={(reservation) => handleReservationClick(reservation)}
                collapsed={!sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                readOnly={true}
              />
            </div>
            
            {/* Overlay für mobile */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-[25] md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Tischplan */}
            <div 
              ref={tablePlanRef}
              className="flex-1 relative overflow-hidden z-10 min-w-0 w-full select-none"
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
              onMouseDown={(e) => {
                if (e.detail > 1) e.preventDefault();
              }}
            >
              {/* Pan-Hintergrund-Layer */}
              <div
                className="absolute inset-0 z-0"
                style={{ 
                  touchAction: 'none',
                  cursor: isPanning ? 'grabbing' : 'grab'
                }}
                onTouchStart={(e) => {
                  if (activeId || activeReservationId || activeBlockId) {
                    panRef.current.isPanning = false;
                    setIsPanning(false);
                    return;
                  }
                  
                  const target = e.target as HTMLElement;
                  const isInteractive = target.closest('[data-dnd-draggable], [data-dnd-droppable], button, a, input, select, textarea');
                  
                  // if (e.touches.length === 1 && !activeId && !activeReservationId && !activeBlockId && !isInteractive) {
                  if (e.touches.length === 1 && !isInteractive) {
                    const touch = e.touches[0];
                    panRef.current.isPanning = true;
                    panRef.current.startX = touch.clientX - panOffset.x;
                    panRef.current.startY = touch.clientY - panOffset.y;
                    setIsPanning(true);
                  } else if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    zoomRef.current.initialDistance = distance;
                    zoomRef.current.initialZoom = zoomLevel;
                    setIsZooming(true);
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    
                    if (zoomRef.current.initialDistance > 0) {
                      const scale = distance / zoomRef.current.initialDistance;
                      const newZoom = Math.max(0.5, Math.min(3, zoomRef.current.initialZoom * scale));
                      
                      const centerX = (touch1.clientX + touch2.clientX) / 2;
                      const centerY = (touch1.clientY + touch2.clientY) / 2;
                      const rect = tablePlanRef.current?.getBoundingClientRect();
                      
                      if (rect) {
                        const relativeX = centerX - rect.left;
                        const relativeY = centerY - rect.top;
                        const zoomFactor = newZoom / zoomLevel;
                        
                        setPanOffset(prev => ({
                          x: relativeX - (relativeX - prev.x) * zoomFactor,
                          y: relativeY - (relativeY - prev.y) * zoomFactor,
                        }));
                      }
                      
                      setZoomLevel(newZoom);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (panRef.current.isPanning && e.touches.length === 1 && !activeId && !activeReservationId && !activeBlockId) {
                    const touch = e.touches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                    const isInteractive = target?.closest('[data-dnd-draggable], [data-dnd-droppable], button, a, input, select, textarea');
                    
                    if (!isInteractive) {
                      setPanOffset({
                        x: touch.clientX - panRef.current.startX,
                        y: touch.clientY - panRef.current.startY,
                      });
                      e.preventDefault();
                      e.stopPropagation();
                    } else {
                      panRef.current.isPanning = false;
                      setIsPanning(false);
                    }
                  } else if (activeId || activeReservationId || activeBlockId) {
                    panRef.current.isPanning = false;
                    setIsPanning(false);
                  }
                }}
                onTouchEnd={(e) => {
                  if (panRef.current.isPanning || e.touches.length < 2) {
                    panRef.current.isPanning = false;
                    setIsPanning(false);
                    if (zoomRef.current.initialDistance > 0) {
                      zoomRef.current.initialDistance = 0;
                      setTimeout(() => setIsZooming(false), 50);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onWheel={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setIsZooming(true);
                    const rect = tablePlanRef.current?.getBoundingClientRect();
                    if (rect) {
                      const mouseX = e.clientX - rect.left;
                      const mouseY = e.clientY - rect.top;
                      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
                      const newZoom = Math.max(0.5, Math.min(3, zoomLevel * zoomDelta));
                      const zoomFactor = newZoom / zoomLevel;
                      setPanOffset(prev => ({
                        x: mouseX - (mouseX - prev.x) * zoomFactor,
                        y: mouseY - (mouseY - prev.y) * zoomFactor,
                      }));
                      setZoomLevel(newZoom);
                    }
                    setTimeout(() => setIsZooming(false), 50);
                  }
                }}
                onMouseDown={(e) => {
                  if (e.button === 1 && !activeId && !activeReservationId && !activeBlockId) {
                    panRef.current.isPanning = true;
                    panRef.current.startX = e.clientX - panOffset.x;
                    panRef.current.startY = e.clientY - panOffset.y;
                    setIsPanning(true);
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onMouseMove={(e) => {
                  if (panRef.current.isPanning && !activeId && !activeReservationId && !activeBlockId) {
                    pendingPanRef.current = {
                      x: e.clientX - panRef.current.startX,
                      y: e.clientY - panRef.current.startY,
                    };

                    if (panRafRef.current === null) {
                      panRafRef.current = requestAnimationFrame(() => {
                        panRafRef.current = null;
                        const next = pendingPanRef.current;
                        if (!next) return;
                        setPanOffset((prev) => (prev.x === next.x && prev.y === next.y ? prev : next));
                      });
                    }
                    e.preventDefault();
                  }
                }}
                onMouseUp={(e) => {
                  if (panRef.current.isPanning) {
                    panRef.current.isPanning = false;
                    setIsPanning(false);
                    e.preventDefault();
                  }
                }}
                onMouseLeave={() => {
                  if (panRef.current.isPanning) {
                    panRef.current.isPanning = false;
                    setIsPanning(false);
                  }
                }}
              />

              {/* Area-Switch */}
              {areas.length > 0 && (
                <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
                  <AreaSelector
                    areas={areas}
                    selectedAreaId={selectedAreaId}
                    onSelect={setSelectedAreaId}
                    menuPlacement="top"
                    minWidthClassName="min-w-[180px] h-10"
                  />
                </div>
              )}

              {/* Zoom-Controls */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                <Button
                  onClick={handleZoomIn}
                  size="sm"
                  variant="outline"
                  className="bg-card/90 backdrop-blur-sm border-input hover:bg-accent min-h-[36px] min-w-[36px] p-0"
                  title="Heranzoomen"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleZoomOut}
                  size="sm"
                  variant="outline"
                  className="bg-card/90 backdrop-blur-sm border-input hover:bg-accent min-h-[36px] min-w-[36px] p-0"
                  title="Herauszoomen"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleZoomReset}
                  size="sm"
                  variant="outline"
                  className="bg-card/90 backdrop-blur-sm border-input hover:bg-accent min-h-[36px] min-w-[36px] p-0"
                  title="Zoom zurücksetzen"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <div className="text-xs text-foreground bg-card/90 backdrop-blur-sm border border-input rounded px-2 py-1 text-center mt-1">
                  {Math.round(zoomLevel * 100)}%
                </div>
              </div>

              {/* Tischplan-Inhalt */}
              <div 
                className="absolute inset-0 w-full h-full z-10 pointer-events-none select-none"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: '0 0',
                  transition: (!isPanning && !isZooming) ? 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                }}
              >
                {/* Obstacles */}
                {obstacles.map((obstacle) => (
                  <div
                    key={obstacle.id}
                    className="absolute rounded-md border border-border bg-muted text-foreground text-xs shadow-[0_10px_24px_rgba(0,0,0,0.3)] flex items-center justify-center px-2 pointer-events-auto"
                    style={{
                      left: obstacle.x,
                      top: obstacle.y,
                      width: obstacle.width,
                      height: obstacle.height,
                      transform: `rotate(${obstacle.rotation || 0}deg)`,
                      backgroundColor: obstacle.color || "rgba(75,85,99,0.8)",
                    }}
                    title={obstacle.name || getObstacleLabel(obstacle.type)}
                  >
                    <div className="flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4 opacity-80" />
                      <span className="truncate">
                        {obstacle.name || getObstacleLabel(obstacle.type)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Tables */}
                {tables.map((table) => {
                  const tableReservations = getTableReservations(table.id);
                  const tableOrders = getTableOrders(table.id);
                  const isActive = activeId === table.id;
                  const position = {
                    x: table.position_x || 50,
                    y: table.position_y || 50,
                  };

                  return (
                    <TableCard
                      key={table.id}
                      table={table}
                      reservations={tableReservations}
                      orders={tableOrders}
                      position={position}
                      onClick={() => handleTableClick(table)}
                      onReservationClick={(reservation) =>
                        handleReservationClick(reservation, table)
                      }
                      onReservationRemove={undefined}
                      isDragging={isActive}
                      allowDragging={false}
                      selectionMode={false}
                      isSelected={false}
                      selectedDate={selectedDate}
                      blockStatus={getBlockStatus(table.id) || undefined}
                    />
                  );
                })}
              </div>

              {tables.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground text-lg mb-4">Noch keine Tische vorhanden</p>
                    <Link
                      href="/dashboard/tables"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-manipulation min-h-[48px]"
                    >
                      <MoveRight className="w-4 h-4" />
                      Tische verwalten
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {(() => {
                  const table = tables.find((t) => t.id === activeId);
                  if (!table) return null;
                  const position = {
                    x: table.position_x || 50,
                    y: table.position_y || 50,
                  };
                  return (
                    <TableCard
                      table={table}
                      reservations={getTableReservations(table.id)}
                      position={position}
                      onClick={() => {}}
                      isDragging={true}
                      allowDragging={false}
                      selectedDate={selectedDate}
                      blockStatus={getBlockStatus(table.id) || undefined}
                    />
                  );
                })()}
              </div>
            ) : activeReservationId ? (
              <div className="opacity-75">
                {(() => {
                  const reservation = reservations.find((r) => r.id === activeReservationId);
                  if (!reservation) return null;
                  return <ReservationCard reservation={reservation} isDragging={true} />;
                })()}
              </div>
            ) : activeBlockId ? (
              <div className="opacity-75">
                {(() => {
                  const block = blocks.find((item) => item.id === activeBlockId);
                  if (!block) return null;
                  return <BlockCard block={block} isDragging={true} />;
                })()}
              </div>
            ) : null}
          </DragOverlay>

          {/* Dialogs */}
          <TableDetailsDialog
            open={tableDetailsOpen}
            onOpenChange={setTableDetailsOpen}
            restaurantId={restaurant.id}
            table={selectedTable}
            tables={tables}
            reservations={selectedTable ? getTableReservations(selectedTable.id) : []}
            orders={selectedTable ? getTableOrders(selectedTable.id) : []}
            selectedDate={selectedDate}
            onTableUpdated={() => refreshData(true)}
            blocks={blocks}
            blockAssignments={blockAssignments}
            onReservationClick={(reservation) => {
              if (selectedTable) {
                handleReservationClick(reservation, selectedTable);
              }
            }}
            onViewOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setOrderDetailDialogOpen(true);
            }}
            onCreateOrder={undefined}
            onNewReservation={() => {}}
            onReservationUpdated={() => refreshData(true)}
            allowTableManagement={false}
            allowDaySpecificActions={false}
            onHideTable={undefined}
            onNotify={addToast}
            readOnly={true}
          />

          <OrderDetailDialog
            open={orderDetailDialogOpen}
            onOpenChange={setOrderDetailDialogOpen}
            restaurantId={restaurant.id}
            orderId={selectedOrderId}
            onOrderUpdated={() => refreshData(true)}
            onNotify={(message, variant) => addToast(message, variant)}
            readOnly={true}
          />
        </DndContext>
      </div>

      {/* Dialoge außerhalb DndContext */}
      <ReservationDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        restaurantId={restaurant.id}
        table={selectedTable}
        selectedDate={selectedReservation ? parseISO(selectedReservation.start_at) : selectedDate}
        reservation={selectedReservation}
        onReservationCreated={() => refreshData(true)}
        onBlockCreated={() => refreshData(true)}
        onReservationUpdated={() => refreshData(true)}
        availableTables={tables}
        onNotify={addToast}
        readOnly={true}
      />
    </div>
  );
}
