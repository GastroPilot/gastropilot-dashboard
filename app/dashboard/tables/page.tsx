"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { tablesApi, Table } from "@/lib/api/tables";
import { obstaclesApi, Obstacle } from "@/lib/api/obstacles";
import { areasApi, Area } from "@/lib/api/areas";
import { authApi } from "@/lib/api/auth";
import { TableCard } from "@/components/table-card";
import { ObstacleCard } from "@/components/obstacle-card";
import { CreateTableDialog } from "@/components/create-table-dialog";
import { CreateObstacleDialog } from "@/components/create-obstacle-dialog";
import { TableDetailsDialog } from "@/components/table-details-dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { confirmAction } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, RefreshCw, MoveLeft, Pencil, Trash2, ChevronDown, Check, ZoomIn, ZoomOut, Maximize2, LayoutGrid, AlertTriangle } from "lucide-react";

// Reuse the same settings key as the dashboard view so zoom persists across both pages
const TABLES_ZOOM_SETTINGS_KEY = "dashboard_zoom_level";

export default function TableManagementPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [allObstacles, setAllObstacles] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [createObstacleOpen, setCreateObstacleOpen] = useState(false);
  const [tableDetailsOpen, setTableDetailsOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedObstacle, setSelectedObstacle] = useState<Obstacle | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeObstacleId, setActiveObstacleId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);
  const { settings, updateSettings, error: settingsError } = useUserSettings();
  const settingsInitializedRef = useRef(false);
  const lastPersistedZoomRef = useRef<string>("");
  const zoomSaveTimeoutRef = useRef<number | null>(null);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaError, setAreaError] = useState("");
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [isSavingArea, setIsSavingArea] = useState(false);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const areaMenuRef = useRef<HTMLDivElement | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const tablePlanRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef({ isPanning: false, startX: 0, startY: 0 });
  const zoomRef = useRef({ initialDistance: 0, initialZoom: 1 });
  const panRafRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
    };
  }, []);

  const sensors = useSensors(
    // Mouse/Pointer Sensor: Für Desktop mit etwas Delay, um Panning zu ermöglichen
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 150,
        tolerance: 5,
      },
    }),
    // Touch Sensor: Für Touch-Geräte (iPad, etc.) mit optimierten Einstellungen
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 5, // Kleinere Distanz für Touch
        delay: 100, // Kürzeres Delay für bessere Responsiveness
        tolerance: 10, // Größere Toleranz für Touch
      },
    })
  );

  const filterByArea = useCallback(<T extends { area_id?: string | null }>(items: T[], areaId: string | null) => {
    if (!areaId) return items;
    return items.filter((item) => (item.area_id ?? null) === areaId);
  }, []);

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

  useEffect(() => {
    if (!settingsError) return;
    addToast(settingsError, "error");
  }, [settingsError, addToast]);

  useEffect(() => {
    if (settingsInitializedRef.current || !settings) return;
    const stored = (settings.settings || {})[TABLES_ZOOM_SETTINGS_KEY];
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
      updateSettings({ [TABLES_ZOOM_SETTINGS_KEY]: rounded }).catch((err) => {
        console.error("Fehler beim Speichern des Zoom-Levels (Tische):", err);
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

  const handleZoomIn = () => {
    setIsZooming(true);
    setZoomLevel((prev) => {
      const next = Math.min(prev * 1.2, 3);
      setTimeout(() => setIsZooming(false), 150);
      return next;
    });
  };

  const handleZoomOut = () => {
    setIsZooming(true);
    setZoomLevel((prev) => {
      const next = Math.max(prev / 1.2, 0.5);
      setTimeout(() => setIsZooming(false), 150);
      return next;
    });
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const loadCurrentUser = async () => {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error("Fehler beim Laden des aktuellen Users:", err);
    }
  };

  const loadData = useCallback(async (background = false, preferredAreaId: string | null = null) => {
    try {
      if (background) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const restaurantsData = await restaurantsApi.list();
      if (restaurantsData.length > 0) {
        const selectedRestaurant = restaurantsData[0];
        setRestaurant(selectedRestaurant);

        const [areasData, tablesData, obstaclesData] = await Promise.all([
          areasApi.list(selectedRestaurant.id),
          tablesApi.list(selectedRestaurant.id),
          obstaclesApi.list(selectedRestaurant.id),
        ]);

        setAreas(areasData);

        let nextAreaId = preferredAreaId;
        if (areasData.length === 0) {
          nextAreaId = null;
        } else if (!nextAreaId || !areasData.some((a) => a.id === nextAreaId)) {
          nextAreaId = areasData[0].id;
        }
        setSelectedAreaId(nextAreaId);

        setAllTables(tablesData);
        setAllObstacles(obstaclesData);
        setTables(filterByArea(tablesData, nextAreaId));
        setObstacles(filterByArea(obstaclesData, nextAreaId));
      }
    } catch (error) {
      console.error("Fehler beim Laden der Tische oder Hindernisse:", error);
    } finally {
      if (background) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [filterByArea]);

  useEffect(() => {
    loadCurrentUser();
    loadData();
  }, [loadData]);

  useEffect(() => {
    setTables(filterByArea(allTables, selectedAreaId));
    setObstacles(filterByArea(allObstacles, selectedAreaId));
  }, [selectedAreaId, allTables, allObstacles, filterByArea]);

  useEffect(() => {
    if (!areaMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (areaMenuRef.current && !areaMenuRef.current.contains(event.target as Node)) {
        setAreaMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAreaMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [areaMenuOpen]);

  const openCreateAreaDialog = () => {
    setEditingArea(null);
    setAreaName("");
    setAreaError("");
    setAreaDialogOpen(true);
  };

  const openEditAreaDialog = () => {
    if (!selectedAreaId) return;
    const area = areas.find((a) => a.id === selectedAreaId);
    if (!area) return;
    setEditingArea(area);
    setAreaName(area.name);
    setAreaError("");
    setAreaDialogOpen(true);
  };

  const handleSaveArea = async () => {
    if (!restaurant) return;
    if (!areaName.trim()) {
      setAreaError("Name darf nicht leer sein.");
      return;
    }
    setIsSavingArea(true);
    try {
      let areaIdToKeep = selectedAreaId;
      if (editingArea) {
        await areasApi.update(restaurant.id, editingArea.id, { name: areaName.trim() });
        addToast("Area wurde aktualisiert.", "success");
        areaIdToKeep = editingArea.id;
      } else {
        const newArea = await areasApi.create(restaurant.id, { name: areaName.trim() });
        areaIdToKeep = newArea.id;
        setSelectedAreaId(newArea.id);
        addToast("Area wurde erstellt.", "success");
      }
      setAreaDialogOpen(false);
      setAreaName("");
      setEditingArea(null);
      await loadData(true, areaIdToKeep);
      setSelectedAreaId(areaIdToKeep);
    } catch (error) {
      console.error("Fehler beim Speichern der Area:", error);
      setAreaError("Fehler beim Speichern der Area");
    } finally {
      setIsSavingArea(false);
    }
  };

  const handleDeleteArea = async () => {
    if (!restaurant || !selectedAreaId) return;
    const area = areas.find((a) => a.id === selectedAreaId);
    if (!area) return;
    if (!confirmAction(`Area "${area.name}" wirklich löschen?`)) return;
    try {
      await areasApi.delete(restaurant.id, selectedAreaId);
      const remaining = areas.filter((a) => a.id !== selectedAreaId);
      const nextId = remaining[0]?.id ?? null;
      setSelectedAreaId(nextId);
      addToast("Area wurde gelöscht.", "success");
      await loadData(true, nextId);
    } catch (error) {
      console.error("Fehler beim Löschen der Area:", error);
      addToast("Fehler beim Löschen der Area", "error");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id;
    if (typeof id === "string" && id.startsWith("obstacle-")) {
      setActiveObstacleId(id.replace("obstacle-", ""));
      return;
    }
    setActiveId(String(id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    const activeRaw = active.id;

    if (!restaurant) {
      setActiveId(null);
      setActiveObstacleId(null);
      return;
    }

    // Obstacles drag
    if (typeof activeRaw === "string" && activeRaw.startsWith("obstacle-")) {
      const obstacleId = activeRaw.replace("obstacle-", "");
      const obstacle = obstacles.find((o) => o.id === obstacleId);
      if (!obstacle) {
        setActiveObstacleId(null);
        return;
      }
      const effectiveZoom = zoomLevel > 0 ? zoomLevel : 1;
      const deltaX = delta?.x || 0;
      const deltaY = delta?.y || 0;
      const newX = Math.max(0, obstacle.x + deltaX / effectiveZoom);
      const newY = Math.max(0, obstacle.y + deltaY / effectiveZoom);
      try {
        await obstaclesApi.update(restaurant.id, obstacle.id, { x: newX, y: newY });
        setObstacles((prev) =>
          prev.map((o) => (o.id === obstacleId ? { ...o, x: newX, y: newY } : o))
        );
        setAllObstacles((prev) =>
          prev.map((o) => (o.id === obstacleId ? { ...o, x: newX, y: newY } : o))
        );
      } catch (error) {
        console.error("Fehler beim Aktualisieren des Hindernisses:", error);
        addToast("Fehler beim Verschieben des Hindernisses", "error");
      }
      setActiveObstacleId(null);
      return;
    }

    // Tables drag
    const tableId = String(activeRaw);
    const table = tables.find((t) => t.id === tableId);
    if (!table) {
      setActiveId(null);
      return;
    }

    const effectiveZoom = zoomLevel > 0 ? zoomLevel : 1;
    const deltaX = delta?.x || 0;
    const deltaY = delta?.y || 0;
    const newX = Math.max(0, (table.position_x || 0) + deltaX / effectiveZoom);
    const newY = Math.max(0, (table.position_y || 0) + deltaY / effectiveZoom);

    try {
      await tablesApi.update(restaurant.id, table.id, {
        position_x: newX,
        position_y: newY,
      });

      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, position_x: newX, position_y: newY } : t
        )
      );
      setAllTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, position_x: newX, position_y: newY } : t
        )
      );
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Tischposition:", error);
      addToast("Fehler beim Verschieben des Tisches", "error");
    }

    setActiveId(null);
  };

  const handleTableCreated = async () => {
    if (!restaurant) return;
    try {
      await loadData(true);
      addToast("Tisch wurde gespeichert.", "success");
    } catch (error) {
      console.error("Fehler beim Anlegen des Tisches:", error);
      addToast("Fehler beim Anlegen des Tisches", "error");
    }
  };

  const handleObstacleSaved = async () => {
    if (!restaurant) return;
    try {
      await loadData(true);
      addToast("Hindernis wurde gespeichert.", "success");
    } catch (error) {
      console.error("Fehler beim Speichern des Hindernisses:", error);
      addToast("Fehler beim Speichern des Hindernisses", "error");
    }
  };

  const handleTableUpdated = async () => {
    try {
      await loadData(true);
      addToast("Tisch wurde aktualisiert.", "success");
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Tisches:", error);
      addToast("Fehler beim Aktualisieren des Tisches", "error");
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setTableDetailsOpen(true);
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!restaurant) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <p className="text-muted-foreground">Kein Restaurant gefunden. Bitte erstelle zuerst ein Restaurant.</p>
        <Link
          href="/dashboard/restaurants"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md bg-primary text-foreground hover:bg-primary/90"
        >
          <MoveLeft className="w-4 h-4" />
          Zum Restaurant
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                toast.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-slate-800/90 border-slate-600 text-slate-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Tische verwalten</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Ziehe Tische oder Hindernisse, um ihre Position zu verändern. Änderungen werden automatisch gespeichert.
                </p>
                {isRefreshing && <div className="text-xs text-primary mt-0.5">Aktualisiere...</div>}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              {(currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
                <>
                  <Button
                    onClick={() => setCreateTableOpen(true)}
                    className="touch-manipulation min-h-[36px]"
                    disabled={!selectedAreaId || areas.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tisch hinzufügen
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedObstacle(null);
                      setCreateObstacleOpen(true);
                    }}
                    variant="outline"
                    className="touch-manipulation min-h-[36px] gap-2"
                    disabled={!selectedAreaId || areas.length === 0}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Hindernis hinzufügen
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Bereich</span>
              <div className="relative" ref={areaMenuRef}>
                <button
                  type="button"
                  onClick={() => setAreaMenuOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={areaMenuOpen}
                  className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px] disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={areas.length === 0}
                >
                  <span className="truncate">
                    {selectedAreaId
                      ? areas.find((a) => a.id === selectedAreaId)?.name || "Area auswählen"
                      : "Area auswählen"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${areaMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {areaMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-border bg-background shadow-xl z-[120] overflow-hidden">
                    <div className="divide-y divide-border">
                      {areas.map((area) => {
                        const active = selectedAreaId === area.id;
                        return (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              if (active) return;
                              setSelectedAreaId(area.id);
                              setAreaMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors ${
                              active
                                ? "bg-card text-foreground font-semibold cursor-default"
                                : "text-foreground hover:bg-accent"
                            }`}
                            disabled={active}
                          >
                            <span className="truncate">{area.name}</span>
                          </button>
                        );
                      })}
                      {areas.length === 0 && (
                        <div className="px-3 py-3 text-sm text-muted-foreground">
                          Keine Area vorhanden.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {(currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={openCreateAreaDialog} className="min-h-[36px]">
                  <Plus className="w-4 h-4 mr-2" />
                  Area erstellen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditAreaDialog}
                  disabled={!selectedAreaId}
                  className="min-h-[36px] shadow-none hover:shadow-none"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Umbenennen
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteArea}
                  disabled={!selectedAreaId}
                  className="min-h-[36px] shadow-none"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </div>
            )}
            {areas.length === 0 && (
              <span className="text-xs text-amber-300">
                Lege zuerst eine Area an, bevor du Tische oder Hindernisse erstellst.
              </span>
            )}
            {selectedAreaId === null && areas.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Wähle eine Area, um neue Tische oder Hindernisse anzulegen.
              </span>
            )}
          </div>

        </div>
      </div>
      <div
        ref={tablePlanRef}
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-background to-card"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseDown={(e) => {
          if (e.detail > 1) e.preventDefault();
        }}
      >
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter}
          onDragStart={handleDragStart} 
          onDragEnd={handleDragEnd}
        >
          <div 
            className="absolute inset-0 z-0 pointer-events-auto"
            style={{ 
              touchAction: 'none',
              cursor: isPanning ? 'grabbing' : 'grab',
            }}
            onTouchStart={(e) => {
              if (activeId || activeObstacleId) {
                panRef.current.isPanning = false;
                setIsPanning(false);
                return;
              }
              
              const target = e.target as HTMLElement;
              const isInteractive = target.closest('[data-dnd-draggable], [data-dnd-droppable], button, a, input, select, textarea');
              
              if (e.touches.length === 1 && !activeId && !activeObstacleId && !isInteractive) {
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
              } else if (panRef.current.isPanning && e.touches.length === 1 && !activeId && !activeObstacleId) {
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
              } else if (activeId || activeObstacleId) {
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
              if (e.button === 1 && !activeId && !activeObstacleId) {
                panRef.current.isPanning = true;
                panRef.current.startX = e.clientX - panOffset.x;
                panRef.current.startY = e.clientY - panOffset.y;
                setIsPanning(true);
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onMouseMove={(e) => {
              if (panRef.current.isPanning && !activeId && !activeObstacleId) {
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

          <div 
            className="absolute inset-0 w-full h-full z-10 select-none pointer-events-none"
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
            {obstacles.map((obstacle) => (
              <ObstacleCard
                key={obstacle.id}
                obstacle={obstacle}
                isDragging={activeObstacleId === obstacle.id}
                onClick={() => {
                  setSelectedObstacle(obstacle);
                  setCreateObstacleOpen(true);
                }}
              />
            ))}
            {tables.map((table) => {
              const position = {
                x: table.position_x || 50,
                y: table.position_y || 50,
              };

              return (
                <TableCard
                  key={table.id}
                  table={table}
                  reservations={[]}
                  position={position}
                  onClick={() => handleTableClick(table)}
                  isDragging={activeId === table.id}
                  allowDragging
                  allowDraggingWithReservations
                />
              );
            })}
          </div>

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground text-lg">Noch keine Tische vorhanden</p>
                <p className="text-muted-foreground text-sm">Lege hier neue Tische an oder verschiebe bestehende.</p>
                {(currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
                  <Button
                    onClick={() => setCreateTableOpen(true)}
                    className="touch-manipulation min-h-[44px]"
                    disabled={!selectedAreaId || areas.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ersten Tisch hinzufügen
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
            <Button
              onClick={handleZoomIn}
              size="sm"
              variant="outline"
              className="bg-accent backdrop-blur-sm border-input hover:bg-accent min-h-[36px] min-w-[36px] p-0"
              title="Heranzoomen"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleZoomOut}
              size="sm"
              variant="outline"
              className="bg-accent backdrop-blur-sm border-input hover:bg-accent min-h-[36px] min-w-[36px] p-0"
              title="Herauszoomen"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleZoomReset}
              size="sm"
              variant="outline"
              className="bg-accent backdrop-blur-sm border-input hover:bg-accent min-h-[36px] min-w-[36px] p-0"
              title="Zoom zurücksetzen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <div className="text-xs text-muted-foreground bg-accent backdrop-blur-sm border border-input rounded px-2 py-1 text-center mt-1">
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="opacity-60">
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
                      reservations={[]}
                      position={position}
                      onClick={() => {}}
                      isDragging
                      allowDragging
                      allowDraggingWithReservations
                    />
                  );
                })()}
              </div>
            ) : null}
            {activeObstacleId ? (
              <div className="opacity-60">
                {(() => {
                  const obstacle = obstacles.find((o) => o.id === activeObstacleId);
                  if (!obstacle) return null;
                  return (
                    <ObstacleCard
                      obstacle={obstacle}
                      isDragging
                      onClick={() => {}}
                    />
                  );
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateTableDialog
        open={createTableOpen}
        onOpenChange={setCreateTableOpen}
        restaurantId={restaurant.id}
        onTableCreated={handleTableCreated}
        areas={areas}
        selectedAreaId={selectedAreaId}
      />

      <CreateObstacleDialog
        open={createObstacleOpen}
        onOpenChange={setCreateObstacleOpen}
        restaurantId={restaurant.id}
        obstacle={selectedObstacle}
        onSaved={handleObstacleSaved}
        onDeleted={handleObstacleSaved}
        areas={areas}
        selectedAreaId={selectedAreaId}
      />

      <TableDetailsDialog
        open={tableDetailsOpen}
        onOpenChange={(open) => {
          setTableDetailsOpen(open);
          if (!open) {
            setSelectedTable(null);
          }
        }}
        restaurantId={restaurant.id}
        table={selectedTable}
        tables={tables}
        reservations={[]}
        selectedDate={new Date()}
        onTableUpdated={handleTableUpdated}
        onReservationClick={() => {}}
        onNewReservation={() => {}}
        onReservationUpdated={handleTableUpdated}
        allowTableManagement
        forceEditMode
        showReservations={false}
        onNotify={addToast}
        areas={areas}
        selectedAreaId={selectedAreaId}
      />

      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingArea ? "Area umbenennen" : "Neue Area erstellen"}</DialogTitle>
            <DialogDescription>
              Areas helfen dir, Etagen oder Räume zu trennen. Tische und Hindernisse gehören immer zu einer Area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-2">
            {areaError && (
              <div className="p-3 rounded-md border border-red-600 bg-red-900/60 text-red-100 text-sm shadow-inner">
                {areaError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Name</label>
              <Input
                value={areaName}
                onChange={(e) => {
                  setAreaName(e.target.value);
                  setAreaError("");
                }}
                placeholder="z. B. Erdgeschoss, Terrasse, 1. OG"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 px-6 pb-4">
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)} disabled={isSavingArea}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveArea} disabled={isSavingArea || !areaName.trim()}>
              {isSavingArea ? "Speichern..." : editingArea ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
