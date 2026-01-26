import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Restaurant } from '@/lib/api/restaurants';
import type { Table } from '@/lib/api/tables';
import type { Reservation } from '@/lib/api/reservations';
import type { Order } from '@/lib/api/orders';
import type { Area } from '@/lib/api/areas';
import type { Obstacle } from '@/lib/api/obstacles';
import type { Block } from '@/lib/api/blocks';
import type { BlockAssignment } from '@/lib/api/block-assignments';

/**
 * Dashboard UI State - for UI-related state that doesn't need to persist
 */
interface DashboardUIState {
  // Sidebar & Menus
  sidebarOpen: boolean;
  areaMenuOpen: boolean;
  actionsMenuOpen: boolean;
  
  // Dialogs
  reservationDialogOpen: boolean;
  tableDetailsOpen: boolean;
  createTempTableOpen: boolean;
  blockEditOpen: boolean;
  orderDetailDialogOpen: boolean;
  orderDialogOpen: boolean;
  
  // Selection
  selectedTable: Table | null;
  selectedReservation: Reservation | null;
  selectedOrderId: number | null;
  selectedTableForOrder: Table | null;
  editingBlock: Block | null;
  selectedAreaId: number | null;
  selectedTableIds: Set<number>;
  selectionMode: boolean;
  
  // Drag & Drop
  activeId: number | null;
  activeReservationId: number | null;
  activeBlockId: number | null;
  
  // Zoom & Pan
  zoomLevel: number;
  panOffset: { x: number; y: number };
  isPanning: boolean;
  isZooming: boolean;
  
  // Loading
  isInitialLoading: boolean;
  updatingStatus: number | null;
  
  // Search
  waitlistSearchQuery: string;
  
  // Toasts
  toasts: Array<{ id: string; message: string; variant?: 'info' | 'error' | 'success' }>;
}

interface DashboardUIActions {
  // Sidebar
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAreaMenuOpen: (open: boolean) => void;
  setActionsMenuOpen: (open: boolean) => void;
  
  // Dialogs
  openReservationDialog: (reservation?: Reservation) => void;
  closeReservationDialog: () => void;
  openTableDetails: (table: Table) => void;
  closeTableDetails: () => void;
  openCreateTempTable: () => void;
  closeCreateTempTable: () => void;
  openBlockEdit: (block?: Block) => void;
  closeBlockEdit: () => void;
  openOrderDetailDialog: (orderId: number) => void;
  closeOrderDetailDialog: () => void;
  openOrderDialog: (table?: Table) => void;
  closeOrderDialog: () => void;
  
  // Selection
  setSelectedAreaId: (id: number | null) => void;
  setSelectedTableIds: (ids: Set<number>) => void;
  toggleTableSelection: (id: number) => void;
  clearTableSelection: () => void;
  setSelectionMode: (enabled: boolean) => void;
  
  // Drag & Drop
  setActiveId: (id: number | null) => void;
  setActiveReservationId: (id: number | null) => void;
  setActiveBlockId: (id: number | null) => void;
  
  // Zoom & Pan
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setIsPanning: (isPanning: boolean) => void;
  setIsZooming: (isZooming: boolean) => void;
  
  // Loading
  setIsInitialLoading: (loading: boolean) => void;
  setUpdatingStatus: (id: number | null) => void;
  
  // Search
  setWaitlistSearchQuery: (query: string) => void;
  
  // Toasts
  addToast: (message: string, variant?: 'info' | 'error' | 'success') => void;
  removeToast: (id: string) => void;
  
  // Reset
  reset: () => void;
}

const initialUIState: DashboardUIState = {
  sidebarOpen: true,
  areaMenuOpen: false,
  actionsMenuOpen: false,
  reservationDialogOpen: false,
  tableDetailsOpen: false,
  createTempTableOpen: false,
  blockEditOpen: false,
  orderDetailDialogOpen: false,
  orderDialogOpen: false,
  selectedTable: null,
  selectedReservation: null,
  selectedOrderId: null,
  selectedTableForOrder: null,
  editingBlock: null,
  selectedAreaId: null,
  selectedTableIds: new Set(),
  selectionMode: false,
  activeId: null,
  activeReservationId: null,
  activeBlockId: null,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  isPanning: false,
  isZooming: false,
  isInitialLoading: true,
  updatingStatus: null,
  waitlistSearchQuery: '',
  toasts: [],
};

export const useDashboardUIStore = create<DashboardUIState & DashboardUIActions>()(
  devtools(
    (set, get) => ({
      ...initialUIState,
      
      // Sidebar
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setAreaMenuOpen: (open) => set({ areaMenuOpen: open }),
      setActionsMenuOpen: (open) => set({ actionsMenuOpen: open }),
      
      // Dialogs
      openReservationDialog: (reservation) => set({
        reservationDialogOpen: true,
        selectedReservation: reservation || null,
      }),
      closeReservationDialog: () => set({
        reservationDialogOpen: false,
        selectedReservation: null,
      }),
      openTableDetails: (table) => set({
        tableDetailsOpen: true,
        selectedTable: table,
      }),
      closeTableDetails: () => set({
        tableDetailsOpen: false,
        selectedTable: null,
      }),
      openCreateTempTable: () => set({ createTempTableOpen: true }),
      closeCreateTempTable: () => set({ createTempTableOpen: false }),
      openBlockEdit: (block) => set({
        blockEditOpen: true,
        editingBlock: block || null,
      }),
      closeBlockEdit: () => set({
        blockEditOpen: false,
        editingBlock: null,
      }),
      openOrderDetailDialog: (orderId) => set({
        orderDetailDialogOpen: true,
        selectedOrderId: orderId,
      }),
      closeOrderDetailDialog: () => set({
        orderDetailDialogOpen: false,
        selectedOrderId: null,
      }),
      openOrderDialog: (table) => set({
        orderDialogOpen: true,
        selectedTableForOrder: table || null,
      }),
      closeOrderDialog: () => set({
        orderDialogOpen: false,
        selectedTableForOrder: null,
      }),
      
      // Selection
      setSelectedAreaId: (id) => set({ selectedAreaId: id }),
      setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),
      toggleTableSelection: (id) => set((state) => {
        const newSet = new Set(state.selectedTableIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedTableIds: newSet };
      }),
      clearTableSelection: () => set({ selectedTableIds: new Set() }),
      setSelectionMode: (enabled) => set({
        selectionMode: enabled,
        selectedTableIds: enabled ? get().selectedTableIds : new Set(),
      }),
      
      // Drag & Drop
      setActiveId: (id) => set({ activeId: id }),
      setActiveReservationId: (id) => set({ activeReservationId: id }),
      setActiveBlockId: (id) => set({ activeBlockId: id }),
      
      // Zoom & Pan
      setZoomLevel: (level) => set({ zoomLevel: Math.max(0.5, Math.min(3, level)) }),
      zoomIn: () => set((state) => ({
        zoomLevel: Math.min(state.zoomLevel * 1.2, 3),
        isZooming: true,
      })),
      zoomOut: () => set((state) => ({
        zoomLevel: Math.max(state.zoomLevel / 1.2, 0.5),
        isZooming: true,
      })),
      resetZoom: () => set({ zoomLevel: 1, panOffset: { x: 0, y: 0 } }),
      setPanOffset: (offset) => set({ panOffset: offset }),
      setIsPanning: (isPanning) => set({ isPanning }),
      setIsZooming: (isZooming) => set({ isZooming }),
      
      // Loading
      setIsInitialLoading: (loading) => set({ isInitialLoading: loading }),
      setUpdatingStatus: (id) => set({ updatingStatus: id }),
      
      // Search
      setWaitlistSearchQuery: (query) => set({ waitlistSearchQuery: query }),
      
      // Toasts
      addToast: (message, variant = 'info') => set((state) => ({
        toasts: [
          ...state.toasts,
          { id: crypto.randomUUID(), message, variant },
        ],
      })),
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
      
      // Reset
      reset: () => set(initialUIState),
    }),
    { name: 'dashboard-ui-store' }
  )
);

/**
 * Dashboard Data State - for server data
 */
interface DashboardDataState {
  restaurant: Restaurant | null;
  areas: Area[];
  tables: Table[];
  allTables: Table[];
  obstacles: Obstacle[];
  allObstacles: Obstacle[];
  reservations: Reservation[];
  blocks: Block[];
  blockAssignments: BlockAssignment[];
  orders: Order[];
  selectedDate: Date;
  currentUser: { role: string } | null;
  reservationToTempTableMap: Map<number, number>;
}

interface DashboardDataActions {
  setRestaurant: (restaurant: Restaurant | null) => void;
  setAreas: (areas: Area[]) => void;
  setTables: (tables: Table[]) => void;
  setAllTables: (tables: Table[]) => void;
  setObstacles: (obstacles: Obstacle[]) => void;
  setAllObstacles: (obstacles: Obstacle[]) => void;
  setReservations: (reservations: Reservation[]) => void;
  setBlocks: (blocks: Block[]) => void;
  setBlockAssignments: (assignments: BlockAssignment[]) => void;
  setOrders: (orders: Order[]) => void;
  setSelectedDate: (date: Date) => void;
  setCurrentUser: (user: { role: string } | null) => void;
  setReservationToTempTableMap: (map: Map<number, number>) => void;
  
  // Optimistic updates
  updateTable: (tableId: number, updates: Partial<Table>) => void;
  updateReservation: (reservationId: number, updates: Partial<Reservation>) => void;
  addReservation: (reservation: Reservation) => void;
  removeReservation: (reservationId: number) => void;
  updateOrder: (orderId: number, updates: Partial<Order>) => void;
  addOrder: (order: Order) => void;
  
  reset: () => void;
}

const initialDataState: DashboardDataState = {
  restaurant: null,
  areas: [],
  tables: [],
  allTables: [],
  obstacles: [],
  allObstacles: [],
  reservations: [],
  blocks: [],
  blockAssignments: [],
  orders: [],
  selectedDate: new Date(),
  currentUser: null,
  reservationToTempTableMap: new Map(),
};

export const useDashboardDataStore = create<DashboardDataState & DashboardDataActions>()(
  devtools(
    (set) => ({
      ...initialDataState,
      
      setRestaurant: (restaurant) => set({ restaurant }),
      setAreas: (areas) => set({ areas }),
      setTables: (tables) => set({ tables }),
      setAllTables: (tables) => set({ allTables: tables }),
      setObstacles: (obstacles) => set({ obstacles }),
      setAllObstacles: (obstacles) => set({ allObstacles: obstacles }),
      setReservations: (reservations) => set({ reservations }),
      setBlocks: (blocks) => set({ blocks }),
      setBlockAssignments: (assignments) => set({ blockAssignments: assignments }),
      setOrders: (orders) => set({ orders }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setReservationToTempTableMap: (map) => set({ reservationToTempTableMap: map }),
      
      // Optimistic updates
      updateTable: (tableId, updates) => set((state) => ({
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, ...updates } : t
        ),
        allTables: state.allTables.map((t) =>
          t.id === tableId ? { ...t, ...updates } : t
        ),
      })),
      
      updateReservation: (reservationId, updates) => set((state) => ({
        reservations: state.reservations.map((r) =>
          r.id === reservationId ? { ...r, ...updates } : r
        ),
      })),
      
      addReservation: (reservation) => set((state) => ({
        reservations: [...state.reservations, reservation],
      })),
      
      removeReservation: (reservationId) => set((state) => ({
        reservations: state.reservations.filter((r) => r.id !== reservationId),
      })),
      
      updateOrder: (orderId, updates) => set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, ...updates } : o
        ),
      })),
      
      addOrder: (order) => set((state) => ({
        orders: [...state.orders, order],
      })),
      
      reset: () => set(initialDataState),
    }),
    { name: 'dashboard-data-store' }
  )
);

/**
 * Settings Store - persisted to localStorage
 */
interface SettingsState {
  dashboardZoomLevel: number;
  theme: 'light' | 'dark' | 'system';
}

interface SettingsActions {
  setDashboardZoomLevel: (level: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  devtools(
    persist(
      (set) => ({
        dashboardZoomLevel: 1,
        theme: 'system',
        
        setDashboardZoomLevel: (level) => set({ dashboardZoomLevel: level }),
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: 'gastropilot-settings',
      }
    ),
    { name: 'settings-store' }
  )
);
