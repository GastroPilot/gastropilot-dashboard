"use client";

import { useEffect, useState, useMemo, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { tablesApi, Table } from "@/lib/api/tables";
import { reservationsApi, Reservation } from "@/lib/api/reservations";
import { ordersApi, Order } from "@/lib/api/orders";
import { Obstacle } from "@/lib/api/obstacles";
import { Area } from "@/lib/api/areas";
import { authApi } from "@/lib/api/auth";
import { impersonation } from "@/lib/api/admin";
import { tableDayConfigsApi, TableDayConfig } from "@/lib/api/table-day-configs";
import { reservationTableDayConfigsApi, ReservationTableDayConfig } from "@/lib/api/reservation-table-day-configs";
import { blocksApi, Block } from "@/lib/api/blocks";
import { blockAssignmentsApi, BlockAssignment } from "@/lib/api/block-assignments";
import { dashboardApi } from "@/lib/api/dashboard";
import { TableCard } from "@/components/table-card";
import { ReservationCard } from "@/components/reservation-card";
import { BlockCard } from "@/components/block-card";
import { WaitlistSidebar } from "@/components/waitlist-sidebar";
import { ReservationDialog } from "@/components/reservation-dialog";
import { TableDetailsDialog } from "@/components/table-details-dialog";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { OrderDialog } from "@/components/order-dialog";
import { CreateTempTableDialog } from "@/components/create-temp-table-dialog";
import { BlockTableDialog } from "@/components/block-table-dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { SkeletonTableCard } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { useDashboardComputations } from "@/lib/hooks/use-dashboard-computations";
import { confirmAction } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, LayoutGrid, MoveRight, ShieldAlert, ChevronDown, Check, ZoomIn, ZoomOut, Maximize2, Link as LinkIcon, Unlink, XSquare, RotateCcw, Clock, ShieldCheck, Users, CheckCircle, XCircle, Calendar, EllipsisVertical } from "lucide-react";
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
          position_x: (config.position_x !== null && config.position_x !== undefined) ? config.position_x : table.position_x,
          position_y: (config.position_y !== null && config.position_y !== undefined) ? config.position_y : table.position_y,
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
            restaurant_id: config.restaurant_id,
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
            created_at_utc: config.created_at_utc,
            updated_at_utc: config.updated_at_utc,
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
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const areaMenuRef = useRef<HTMLDivElement | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  
  // Dialog State
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [tableDetailsOpen, setTableDetailsOpen] = useState(false);
  const [createTempTableOpen, setCreateTempTableOpen] = useState(false);
  const [blockEditOpen, setBlockEditOpen] = useState(false);
  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  
  // Selection State
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  
  // Drag State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  // UI Controls
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [waitlistSearchQuery, setWaitlistSearchQuery] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
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
    tableDayConfigs,
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
  const tables = useMemo(() => filterByArea(allTables, selectedAreaId), [allTables, selectedAreaId, filterByArea]);
  const obstacles = useMemo(() => filterByArea(allObstacles, selectedAreaId), [allObstacles, selectedAreaId, filterByArea]);
  
  // Alle Berechnungen gecached
  const computations = useDashboardComputations({
    reservations,
    blocks,
    blockAssignments,
    tables,
    orders,
    selectedDate,
    reservationToTempTableMap,
  });
  
  const {
    waitlistReservations,
    blockTemplates,
    getTableReservations,
    getTableOrders,
    hasTimeConflict,
    hasBlockConflict,
    getBlockStatus,
    getTableName,
    getReservationTableLabel,
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
  
  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaMenuRef.current && !areaMenuRef.current.contains(event.target as Node)) {
        setAreaMenuOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  // DRAG & DROP HANDLERS
  // ============================================
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id;
    const activeData = event.active.data.current as
      | { type?: "reservation" | "table" | "block"; reservationId?: string; tableId?: string; blockId?: string }
      | undefined;
    const activeType = activeData?.type;
    
    panRef.current.isPanning = false;
    setIsPanning(false);
    
    if (activeType === "reservation") {
      const reservationId = activeData?.reservationId ?? String(id);
      setActiveReservationId(reservationId);
      setTableDetailsOpen(false);
    } else if (activeType === "block") {
      const blockId = activeData?.blockId ?? String(id).replace("block-", "");
      setActiveBlockId(blockId || null);
    } else {
      const tableId = activeData?.tableId ?? String(id);
      setActiveId(tableId);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeIdValue = active.id;
    const activeData = active.data.current as
      | { type?: "reservation" | "table" | "block"; reservationId?: string; tableId?: string; blockId?: string }
      | undefined;
    const activeType = activeData?.type;

    // Block drag handling
    if (activeType === "block") {
      const blockId = activeData?.blockId ?? String(activeIdValue).replace("block-", "");
      const block = blocks.find((item) => item.id === blockId);
      if (!block || !restaurant) {
        setActiveBlockId(null);
        return;
      }

      if (over && over.id) {
        const tableId = String(over.id);
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
          setActiveBlockId(null);
          return;
        }
        if (!table.is_active) {
          addToast(`${table.number} ist deaktiviert und kann nicht blockiert werden.`, "error");
          setActiveBlockId(null);
          return;
        }
        
        const alreadyAssigned = blockAssignments.some(
          (assignment) => assignment.block_id === block.id && assignment.table_id === tableId
        );
        if (alreadyAssigned) {
          addToast(`Block ist bereits auf ${table.number} zugewiesen.`, "info");
          setActiveBlockId(null);
          return;
        }

        if (hasBlockConflict(tableId, block.start_at, block.end_at)) {
          addToast(`Es existiert bereits eine Blockierung in diesem Zeitraum auf ${table.number}.`, "error");
          setActiveBlockId(null);
          return;
        }

        const tableReservations = getTableReservations(tableId);
        const blockStart = parseISO(block.start_at);
        const blockEnd = parseISO(block.end_at);
        const conflict = tableReservations.some((reservation) => {
          const isActive =
            reservation.status !== "canceled" &&
            reservation.status !== "completed" &&
            reservation.status !== "no_show";
          if (!isActive) return false;
          const resStart = parseISO(reservation.start_at);
          const resEnd = parseISO(reservation.end_at);
          return blockStart < resEnd && blockEnd > resStart;
        });
        
        if (conflict) {
          addToast(`Blockierung überschneidet sich mit einer Reservierung auf ${table.number}.`, "error");
          setActiveBlockId(null);
          return;
        }

        try {
          await blockAssignmentsApi.create(restaurant.id, {
            block_id: block.id,
            table_id: tableId,
          });
          addToast(`Blockierung auf ${table.number} erstellt.`, "success");
          refreshData(true);
        } catch (error) {
          console.error("Fehler beim Erstellen der Blockzuordnung:", error);
          addToast("Fehler beim Erstellen der Blockierung", "error");
        }
      }

      setActiveBlockId(null);
      return;
    }

    // Reservation drag handling
    if (activeType === "reservation" || (activeType !== "table" && String(activeIdValue).startsWith("temp-"))) {
      const reservationId = activeData?.reservationId ?? String(activeIdValue);
      const reservation = reservations.find((r) => r.id === reservationId);

      if (!reservation || !restaurant) {
        setActiveReservationId(null);
        return;
      }

      // Drop on waitlist
      if (over && (over.id === "waitlist" || over.id === "waitlist-dropzone" || String(over.id) === "waitlist")) {
        try {
          await reservationsApi.update(restaurant.id, reservation.id, {
            table_id: null,
            status: "pending",
          });
          const tempTableId = reservationToTempTableMap.get(reservation.id);
          if (tempTableId !== undefined) {
            const tableDayConfigId = String(tempTableId).replace('temp-', '');
            try {
              await reservationTableDayConfigsApi.delete(restaurant.id, reservation.id, tableDayConfigId);
            } catch (error) {
              console.error("Fehler beim Entfernen der Zuordnung zu temporärem Tisch:", error);
            }
          }
          addToast(
            `${reservation.guest_name || "Gast"} wurde zurück auf die Warteliste verschoben.`,
            "info"
          );
          refreshData(true);
        } catch (error) {
          console.error("Fehler beim Entfernen des Tisches:", error);
          addToast("Fehler beim Entfernen des Tisches", "error");
        }
        setActiveReservationId(null);
        return;
      }

      // Drop on table
      if (over && over.id) {
        const tableId = String(over.id);
        const table = tables.find((t) => t.id === tableId);

        if (!table) {
          setActiveReservationId(null);
          return;
        }

        if (!table.is_active) {
          addToast(`${table.number} ist deaktiviert und kann nicht zugewiesen werden.`, "error");
          setActiveReservationId(null);
          return;
        }

        if (table.is_active && table.capacity >= reservation.party_size) {
          if (String(tableId).startsWith("temp-") !== true && hasBlockConflict(tableId, reservation.start_at, reservation.end_at)) {
            addToast(`${table.number} ist in diesem Zeitraum blockiert.`, "error");
            setActiveReservationId(null);
            return;
          }

          // Temporary table
          if (String(tableId).startsWith("temp-")) {
            try {
              const tableDayConfigId = String(tableId).replace("temp-", "");
              await reservationsApi.update(restaurant.id, reservation.id, {
                table_id: null,
                status: "confirmed",
              });
              await reservationTableDayConfigsApi.create(restaurant.id, {
                reservation_id: reservation.id,
                table_day_config_id: tableDayConfigId,
                start_at: reservation.start_at,
                end_at: reservation.end_at,
              });
              addToast(
                `Reservierung ${reservation.guest_name || "Gast"} auf temporären Tisch ${table.number} zugewiesen.`,
                "success"
              );
              refreshData(true);
            } catch (error) {
              console.error("Fehler beim Zuweisen des temporären Tisches:", error);
              addToast("Fehler beim Zuweisen des temporären Tisches", "error");
            }
            setActiveReservationId(null);
            return;
          }

          // Check time conflict
          if (hasTimeConflict(reservation, tableId)) {
            addToast(
              `Konflikt: ${reservation.guest_name || "Gast"} kollidiert mit einer bestehenden Reservierung auf ${table.number}.`,
              "error"
            );
            setActiveReservationId(null);
            return;
          }

          // Assign to standard table
          try {
            await reservationsApi.update(restaurant.id, reservation.id, {
              table_id: tableId,
              status: "confirmed",
            });
            addToast(
              `${table.number} zugewiesen an ${reservation.guest_name || "Gast"}.`,
              "success"
            );
            refreshData(true);
          } catch (error) {
            console.error("Fehler beim Zuweisen des Tisches:", error);
            addToast("Fehler beim Zuweisen des Tisches", "error");
          }
        } else {
          addToast(
            `${table.number} hat nicht genügend Plätze für ${reservation.guest_name || "diese Reservierung"}.`,
            "error"
          );
        }
      }

      setActiveReservationId(null);
      return;
    }

    // Table drag handling (position change)
    const tableId = String(activeData?.tableId ?? activeIdValue);
    const table = tables.find((t) => t.id === tableId);
    const isTempTable = table?.id ? String(table.id).startsWith("temp-") : false;

    if (!table || !restaurant) {
      setActiveId(null);
      return;
    }

    const deltaX = event.delta?.x || 0;
    const deltaY = event.delta?.y || 0;
    
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      setActiveId(null);
      return;
    }
    
    const currentX = table.position_x || 0;
    const currentY = table.position_y || 0;
    const effectiveZoom = zoomLevel > 0 ? zoomLevel : 1;
    const newX = currentX + deltaX / effectiveZoom;
    const newY = currentY + deltaY / effectiveZoom;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const existingConfig = tableDayConfigs.find((c) =>
        isTempTable
          ? c.table_id === null && c.is_temporary && c.number === table.number
          : c.table_id === table.id
      );
      
      const updateData: any = {
        table_id: isTempTable ? null : table.id,
        date: dateStr,
        position_x: Math.max(0, newX),
        position_y: Math.max(0, newY),
      };
      
      if (isTempTable) {
        updateData.is_temporary = true;
        updateData.number = table.number;
        updateData.capacity = table.capacity;
        updateData.shape = table.shape;
        updateData.notes = table.notes;
      }
      
      if (existingConfig) {
        if (existingConfig.width !== null) updateData.width = existingConfig.width;
        if (existingConfig.height !== null) updateData.height = existingConfig.height;
        if (existingConfig.is_active !== null) updateData.is_active = existingConfig.is_active;
        if (existingConfig.color !== null) updateData.color = existingConfig.color;
        if (existingConfig.rotation !== null) updateData.rotation = existingConfig.rotation;
        if (existingConfig.join_group_id !== null) updateData.join_group_id = existingConfig.join_group_id;
        if (existingConfig.is_joinable !== null) updateData.is_joinable = existingConfig.is_joinable;
      } else {
        updateData.width = table.width;
        updateData.height = table.height;
        updateData.is_active = table.is_active;
        updateData.color = table.color;
        updateData.rotation = table.rotation;
        updateData.is_joinable = table.is_joinable;
      }
      
      await tableDayConfigsApi.createOrUpdate(restaurant.id, updateData);
      addToast(`Tisch ${table.number} wurde verschoben.`, "success");
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Speichern der Tischposition:", error);
      addToast("Fehler beim Speichern der Tischposition", "error");
    }

    setActiveId(null);
  }, [
    blocks, blockAssignments, tables, reservations, restaurant, 
    reservationToTempTableMap, tableDayConfigs, selectedDate, zoomLevel,
    addToast, refreshData, hasBlockConflict, hasTimeConflict, getTableReservations
  ]);

  // ============================================
  // TABLE HANDLERS
  // ============================================

  const handleTableClick = useCallback((table: Table, event?: React.MouseEvent) => {
    if (selectionMode) {
      event?.stopPropagation();
      setSelectedTableIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(table.id)) {
          newSet.delete(table.id);
          if (table.join_group_id) {
            tables.filter(t => t.join_group_id === table.join_group_id && t.id !== table.id)
              .forEach(t => newSet.delete(t.id));
          }
        } else {
          newSet.add(table.id);
          if (table.join_group_id) {
            tables.filter(t => t.join_group_id === table.join_group_id && t.id !== table.id)
              .forEach(t => newSet.add(t.id));
          }
        }
        return newSet;
      });
    } else {
      setSelectedTable(table);
      setSelectedReservation(null);
      setTableDetailsOpen(true);
    }
  }, [selectionMode, tables]);

  const handleHideTable = useCallback(async (table: Table) => {
    if (!restaurant) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const tableId = String(table.id).startsWith("temp-") ? null : table.id;
    
    try {
      const existingConfig = tableDayConfigs.find(c => 
        c.table_id === tableId || (tableId === null && c.is_temporary && c.number === table.number)
      );
      
      const updateData: any = {
        table_id: tableId,
        date: dateStr,
        is_hidden: true,
        position_x: existingConfig?.position_x ?? table.position_x,
        position_y: existingConfig?.position_y ?? table.position_y,
        width: existingConfig?.width ?? table.width,
        height: existingConfig?.height ?? table.height,
        is_active: existingConfig?.is_active ?? table.is_active,
        color: existingConfig?.color ?? table.color,
        join_group_id: existingConfig?.join_group_id,
        is_joinable: existingConfig?.is_joinable ?? table.is_joinable,
        rotation: existingConfig?.rotation ?? table.rotation,
        number: existingConfig?.number ?? table.number,
        capacity: existingConfig?.capacity ?? table.capacity,
        shape: existingConfig?.shape ?? table.shape,
        notes: existingConfig?.notes ?? table.notes,
        is_temporary: existingConfig?.is_temporary || String(table.id).startsWith("temp-"),
      };
      
      await tableDayConfigsApi.createOrUpdate(restaurant.id, updateData);
      addToast(`Tisch ${table.number} wurde für diesen Tag ausgeblendet.`, "success");
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Verstecken des Tisches:", error);
      addToast("Fehler beim Verstecken des Tisches", "error");
    }
  }, [restaurant, selectedDate, tableDayConfigs, addToast, refreshData]);

  const handleJoinTables = useCallback(async () => {
    if (!restaurant || selectedTableIds.size < 2) return;
    
    try {
      const groupId = Array.from(selectedTableIds)[0];
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      await Promise.all(
        Array.from(selectedTableIds).map(tableId => {
          const table = tables.find(t => t.id === tableId);
          if (!table) return Promise.resolve();
          
          const isTempTable = String(table.id).startsWith("temp-");
          return tableDayConfigsApi.createOrUpdate(restaurant.id, {
            table_id: isTempTable ? null : tableId,
            date: dateStr,
            position_x: table.position_x,
            position_y: table.position_y,
            width: table.width,
            height: table.height,
            is_active: table.is_active,
            color: table.color,
            rotation: table.rotation,
            is_joinable: true,
            join_group_id: groupId,
            ...(isTempTable
              ? {
                  is_temporary: true,
                  number: table.number,
                  capacity: table.capacity,
                  shape: table.shape,
                  notes: table.notes,
                }
              : {}),
          });
        })
      );
      
      addToast(`${selectedTableIds.size} Tische wurden zusammengeschoben.`, "success");
      setSelectedTableIds(new Set());
      setSelectionMode(false);
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Zusammenführen der Tische:", error);
      addToast("Fehler beim Zusammenführen der Tische", "error");
    }
  }, [restaurant, selectedTableIds, selectedDate, tables, addToast, refreshData]);

  const handleUnjoinTables = useCallback(async () => {
    if (!restaurant || selectedTableIds.size === 0) return;
    
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      await Promise.all(
        Array.from(selectedTableIds).map(tableId => {
          const table = tables.find(t => t.id === tableId);
          if (!table) return Promise.resolve();
          
          const isTempTable = String(table.id).startsWith("temp-");
          const existingConfig = tableDayConfigs.find(c =>
            isTempTable
              ? c.table_id === null && c.is_temporary && c.number === table.number
              : c.table_id === tableId
          );
          
          return tableDayConfigsApi.createOrUpdate(restaurant.id, {
            table_id: isTempTable ? null : tableId,
            date: dateStr,
            position_x: existingConfig?.position_x ?? table.position_x,
            position_y: existingConfig?.position_y ?? table.position_y,
            width: existingConfig?.width ?? table.width,
            height: existingConfig?.height ?? table.height,
            is_active: existingConfig?.is_active ?? table.is_active,
            color: existingConfig?.color ?? table.color,
            rotation: existingConfig?.rotation ?? table.rotation,
            is_joinable: false,
            join_group_id: null,
            ...(isTempTable
              ? {
                  is_temporary: true,
                  number: existingConfig?.number ?? table.number,
                  capacity: existingConfig?.capacity ?? table.capacity,
                  shape: existingConfig?.shape ?? table.shape,
                  notes: existingConfig?.notes ?? table.notes,
                }
              : {}),
          });
        })
      );
      
      addToast(`${selectedTableIds.size} Tische wurden getrennt.`, "success");
      setSelectedTableIds(new Set());
      setSelectionMode(false);
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Trennen der Tische:", error);
      addToast("Fehler beim Trennen der Tische", "error");
    }
  }, [restaurant, selectedTableIds, selectedDate, tables, tableDayConfigs, addToast, refreshData]);

  const handleCancelSelection = useCallback(() => {
    setSelectedTableIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleCreateTempTable = useCallback(async (tableData: {
    number: string;
    capacity: number;
    shape?: string;
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
    color?: string;
    notes?: string;
  }) => {
    if (!restaurant) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    try {
      await tableDayConfigsApi.createOrUpdate(restaurant.id, {
        table_id: null,
        date: dateStr,
        is_temporary: true,
        is_hidden: false,
        number: tableData.number,
        capacity: tableData.capacity,
        shape: tableData.shape ?? "rectangle",
        position_x: tableData.position_x ?? 50,
        position_y: tableData.position_y ?? 50,
        width: tableData.width ?? 120,
        height: tableData.height ?? 120,
        is_active: true,
        color: tableData.color ?? null,
        notes: tableData.notes ?? null,
        is_joinable: false,
        join_group_id: null,
      });
      
      addToast(`Tisch ${tableData.number} wurde für diesen Tag erstellt.`, "success");
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Erstellen des temporären Tisches:", error);
      addToast("Fehler beim Erstellen des temporären Tisches", "error");
    }
  }, [restaurant, selectedDate, addToast, refreshData]);

  const handleResetTablesForDate = useCallback(async () => {
    if (!restaurant) return;
    
    if (!confirmAction("Möchten Sie wirklich alle tages-spezifischen Änderungen für diesen Tag zurücksetzen?")) {
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const tempConfigIds = tableDayConfigs.filter((config) => config.is_temporary).map((config) => config.id);
      
      if (tempConfigIds.length > 0) {
        const tempAssignments = reservationTableDayConfigs.filter((assignment) =>
          tempConfigIds.includes(assignment.table_day_config_id)
        );
        
        if (tempAssignments.length > 0) {
          const reservationCount = new Set(tempAssignments.map((a) => a.reservation_id)).size;
          const ok = confirmAction(
            `Es gibt ${reservationCount} Reservierung${reservationCount === 1 ? "" : "en"} auf temporären Tischen. Diese werden als "Ausstehend" zurückgesetzt. Fortfahren?`
          );
          if (!ok) return;
          
          const updatedReservations = new Set<string>();
          for (const assignment of tempAssignments) {
            if (!updatedReservations.has(assignment.reservation_id)) {
              await reservationsApi.update(restaurant.id, assignment.reservation_id, {
                table_id: null,
                status: "pending",
              });
              updatedReservations.add(assignment.reservation_id);
            }
            await reservationTableDayConfigsApi.delete(
              restaurant.id,
              assignment.reservation_id,
              assignment.table_day_config_id
            );
          }
          addToast("Reservierungen wurden zurück in die Reservierungsübersicht verschoben.", "success");
        }
      }
      
      await tableDayConfigsApi.deleteAllForDate(restaurant.id, dateStr);
      addToast("Tischanordnung wurde auf die Standard-Anordnung zurückgesetzt.", "success");
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Zurücksetzen der Tischanordnung:", error);
      addToast("Fehler beim Zurücksetzen der Tischanordnung.", "error");
    }
  }, [restaurant, selectedDate, tableDayConfigs, reservationTableDayConfigs, addToast, refreshData]);

  // ============================================
  // RESERVATION HANDLERS
  // ============================================

  const handleReservationClick = useCallback((reservation: Reservation, table?: Table) => {
    setSelectedReservation(reservation);
    setSelectedTable(table || tables.find((t) => t.id === reservation.table_id) || null);
    setReservationDialogOpen(true);
  }, [tables]);

  const handleReservationDeleted = useCallback(async (reservation: Reservation) => {
    if (!restaurant) return;
    const ok = confirmAction("Reservierung wirklich löschen?");
    if (!ok) return;
    try {
      await reservationsApi.delete(restaurant.id, reservation.id);
      refreshData(true);
      setReservationDialogOpen(false);
    } catch (error) {
      console.error("Fehler beim Löschen der Reservierung:", error);
      addToast("Fehler beim Löschen der Reservierung", "error");
    }
  }, [restaurant, addToast, refreshData]);

  const handleBlockTemplateEdit = useCallback((block: Block) => {
    setEditingBlock(block);
    setBlockEditOpen(true);
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getStatusLabel = useCallback((status: Reservation["status"]) => {
    switch (status) {
      case "confirmed": return "Bestätigt";
      case "seated": return "Platziert";
      case "completed": return "Abgeschlossen";
      case "canceled": return "Storniert";
      case "no_show": return "No-Show";
      default: return "Ausstehend";
    }
  }, []);

  const updateReservationStatus = useCallback(async (
    reservation: Reservation,
    newStatus: Reservation["status"]
  ) => {
    if (!restaurant) return;

    setUpdatingStatus(reservation.id);
    try {
      await reservationsApi.update(restaurant.id, reservation.id, {
        status: newStatus,
      });
      const variant =
        newStatus === "completed" || newStatus === "no_show" || newStatus === "seated"
          ? "success"
          : "info";
      addToast(
        `${reservation.guest_name || "Gast"} → Status: ${getStatusLabel(newStatus)}`,
        variant
      );
      refreshData(true);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      addToast("Fehler beim Aktualisieren des Status", "error");
    } finally {
      setUpdatingStatus(null);
    }
  }, [restaurant, addToast, refreshData, getStatusLabel]);

  const STATUS_ICON_MAP: Record<Reservation["status"], { Icon: typeof Clock; tone: string }> = useMemo(() => ({
    pending: { Icon: Clock, tone: "bg-blue-900/40 border-blue-600 text-blue-100" },
    confirmed: { Icon: ShieldCheck, tone: "bg-indigo-900/40 border-indigo-600 text-indigo-100" },
    seated: { Icon: Users, tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100" },
    completed: { Icon: CheckCircle, tone: "bg-amber-900/30 border-amber-600 text-amber-100" },
    canceled: { Icon: XCircle, tone: "bg-red-900/30 border-red-600 text-red-100" },
    no_show: { Icon: XCircle, tone: "bg-orange-900/30 border-orange-600 text-orange-100" },
  }), []);

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
                {selectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelSelection}
                      className="touch-manipulation min-h-[32px] text-xs px-2 py-1"
                    >
                      <XSquare className="w-3.5 h-3.5 mr-1" />
                      <span className="text-xs">Abbrechen</span>
                    </Button>
                    {(currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleJoinTables}
                          disabled={selectedTableIds.size < 2}
                          className="touch-manipulation min-h-[32px] text-xs px-2 py-1"
                          title="Tische zusammenschieben"
                        >
                          <LinkIcon className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">Zusammenführen</span>
                          <span className="ml-1 text-xs">({selectedTableIds.size})</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUnjoinTables}
                          disabled={selectedTableIds.size === 0}
                          className="touch-manipulation min-h-[32px] text-xs px-2 py-1"
                          title="Tische trennen"
                        >
                          <Unlink className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">Trennen</span>
                          <span className="ml-1 text-xs">({selectedTableIds.size})</span>
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {(currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
                      <div className="relative" ref={actionsMenuRef}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActionsMenuOpen((prev) => !prev)}
                          className="touch-manipulation min-h-[34px] text-xs px-3 py-1"
                          title="Tageslayout-Aktionen"
                        >
                          <EllipsisVertical className="w-4 h-4 mr-2" />
                          <span className="text-xs">Tageslayout</span>
                          <ChevronDown className={`w-3.5 h-3.5 ml-2 transition-transform ${actionsMenuOpen ? "rotate-180" : ""}`} />
                        </Button>
                        {actionsMenuOpen && (
                          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-card shadow-xl z-40 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                setCreateTempTableOpen(true);
                              }}
                              disabled={!selectedAreaId || areas.length === 0}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                !selectedAreaId || areas.length === 0
                                  ? "text-muted-foreground cursor-not-allowed bg-background"
                                  : "text-foreground hover:bg-accent"
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                              <span>Temporären Tisch hinzufügen</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                setSelectionMode(true);
                              }}
                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-foreground hover:bg-accent transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>Tische zusammenführen</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                handleResetTablesForDate();
                              }}
                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-foreground hover:bg-accent transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Zurücksetzen</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
                  </>
                )}
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
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
                getBlockTableLabels={getBlockTableLabels}
                searchQuery={waitlistSearchQuery}
                onSearchChange={setWaitlistSearchQuery}
                onReservationClick={(reservation) => handleReservationClick(reservation)}
                onReservationDelete={handleReservationDeleted}
                onBlockClick={handleBlockTemplateEdit}
                onNewReservation={() => {
                  setSelectedReservation(null);
                  setSelectedTable(null);
                  setReservationDialogOpen(true);
                }}
                collapsed={!sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
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
                  <div className="relative" ref={areaMenuRef}>
                    <button
                      type="button"
                      onClick={() => setAreaMenuOpen((prev) => !prev)}
                      className="h-10 min-w-[180px] rounded-md border border-input bg-background text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedAreaId
                          ? areas.find((a) => a.id === selectedAreaId)?.name || "Area auswählen"
                          : "Area auswählen"}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${areaMenuOpen ? "rotate-180" : ""}`} />
                    </button>
                    {areaMenuOpen && (
                      <div className="absolute bottom-full mb-2 w-full rounded-lg border border-border bg-card shadow-xl max-h-60 overflow-auto">
                        {areas.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              setSelectedAreaId(area.id);
                              setAreaMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm ${
                              selectedAreaId === area.id
                                ? "font-semibold text-foreground bg-accent"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            {area.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                      onReservationRemove={async (reservation) => {
                        if (!restaurant) return;
                        try {
                          await reservationsApi.update(restaurant.id, reservation.id, {
                            table_id: null,
                            status: "pending",
                          });
                          const tempTableId = reservationToTempTableMap.get(reservation.id);
                          if (tempTableId !== undefined) {
                            const tableDayConfigId = String(tempTableId).replace('temp-', '');
                            try {
                              await reservationTableDayConfigsApi.delete(restaurant.id, reservation.id, tableDayConfigId);
                            } catch (error) {
                              console.error("Fehler beim Entfernen der Zuordnung zu temporärem Tisch:", error);
                            }
                          }
                          refreshData(true);
                        } catch (error) {
                          console.error("Fehler beim Entfernen des Tisches:", error);
                          addToast("Fehler beim Entfernen des Tisches", "error");
                        }
                      }}
                      isDragging={isActive}
                      allowDragging={!selectionMode}
                      selectionMode={selectionMode}
                      isSelected={selectedTableIds.has(table.id)}
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
            onCreateOrder={() => {
              setSelectedTableForOrder(selectedTable);
              setOrderDialogOpen(true);
            }}
            onNewReservation={() => {
              setSelectedReservation(null);
              setReservationDialogOpen(true);
            }}
            onReservationUpdated={() => refreshData(true)}
            allowTableManagement={false}
            allowDaySpecificActions={true}
            onHideTable={handleHideTable}
            onNotify={addToast}
          />

          <OrderDetailDialog
            open={orderDetailDialogOpen}
            onOpenChange={setOrderDetailDialogOpen}
            restaurantId={restaurant.id}
            orderId={selectedOrderId}
            onOrderUpdated={() => refreshData(true)}
            onNotify={(message, variant) => addToast(message, variant)}
          />

          <OrderDialog
            open={orderDialogOpen}
            onOpenChange={setOrderDialogOpen}
            restaurantId={restaurant.id}
            table={selectedTableForOrder}
            availableTables={tables}
            onOrderCreated={() => {
              refreshData(true);
              setOrderDialogOpen(false);
            }}
            onOrderUpdated={() => {
              refreshData(true);
              setOrderDialogOpen(false);
            }}
            onNotify={(message, variant) => addToast(message, variant)}
          />

          <CreateTempTableDialog
            open={createTempTableOpen}
            onOpenChange={setCreateTempTableOpen}
            restaurantId={restaurant.id}
            selectedDate={selectedDate}
            onTableCreated={() => refreshData(true)}
            onNotify={addToast}
            initialPosition={{
              x: panOffset.x + (tablePlanRef.current?.clientWidth ?? 0) / 2 / zoomLevel - 60,
              y: panOffset.y + (tablePlanRef.current?.clientHeight ?? 0) / 2 / zoomLevel - 60,
            }}
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
      />

      <BlockTableDialog
        open={blockEditOpen}
        onOpenChange={(open) => {
          setBlockEditOpen(open);
          if (!open) {
            setEditingBlock(null);
          }
        }}
        restaurantId={restaurant.id}
        tables={tables}
        block={editingBlock}
        blocks={blocks}
        blockAssignments={blockAssignments}
        selectedDate={selectedDate}
        onBlockCreated={() => refreshData(true)}
        onNotify={addToast}
      />
    </div>
  );
}
