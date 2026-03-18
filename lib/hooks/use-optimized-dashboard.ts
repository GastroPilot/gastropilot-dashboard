'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardApi, DashboardData } from '@/lib/api/dashboard';
import { useDashboardDataStore, useDashboardUIStore } from '@/lib/stores/dashboard-store';
import { format } from 'date-fns';
import type { Restaurant } from '@/lib/api/restaurants';
import type { Table } from '@/lib/api/tables';
import type { Reservation } from '@/lib/api/reservations';
import type { Order } from '@/lib/api/orders';
import type { Area } from '@/lib/api/areas';
import type { Obstacle } from '@/lib/api/obstacles';
import type { Block } from '@/lib/api/blocks';
import type { BlockAssignment } from '@/lib/api/block-assignments';

interface UseDashboardOptions {
  restaurantId?: string;
  onError?: (error: Error) => void;
}

interface UseDashboardReturn {
  // Data
  restaurant: Restaurant | null;
  areas: Area[];
  tables: Table[];
  obstacles: Obstacle[];
  reservations: Reservation[];
  blocks: Block[];
  blockAssignments: BlockAssignment[];
  orders: Order[];
  selectedDate: Date;
  
  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  
  // Actions
  setSelectedDate: (date: Date) => void;
  refresh: () => Promise<void>;
  refreshInBackground: () => Promise<void>;
}

/**
 * Optimierter Dashboard-Hook der den Batch-Endpoint nutzt.
 * 
 * Vorteile gegenüber einzelnen API-Aufrufen:
 * - Ein Request statt 10+
 * - Schnellere initiale Ladezeit
 * - Weniger Server-Last
 * - Automatische Synchronisation mit Zustand Store
 */
export function useOptimizedDashboard({
  restaurantId,
  onError,
}: UseDashboardOptions = {}): UseDashboardReturn {
  const queryClient = useQueryClient();
  
  // Zustand Store
  const {
    restaurant,
    areas,
    tables,
    obstacles,
    reservations,
    blocks,
    blockAssignments,
    orders,
    selectedDate,
    setRestaurant,
    setAreas,
    setTables,
    setAllTables,
    setObstacles,
    setAllObstacles,
    setReservations,
    setBlocks,
    setBlockAssignments,
    setOrders,
    setSelectedDate: setStoreDate,
  } = useDashboardDataStore();
  
  const { setIsInitialLoading } = useDashboardUIStore();
  
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for debouncing
  const lastFetchRef = useRef<string>('');
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * Fetch all dashboard data in one request
   */
  const fetchDashboardData = useCallback(async (
    restId: string,
    date: Date,
    options: { background?: boolean } = {}
  ) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = `${restId}-${dateStr}`;
    
    // Skip if same request is already in progress or recently completed
    if (lastFetchRef.current === cacheKey && options.background) {
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    if (!options.background) {
      setIsLoading(true);
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    try {
      const data = await dashboardApi.getDashboardData(restId, date);
      
      lastFetchRef.current = cacheKey;
      
      // Update store with all data at once
      if (data.restaurant) {
        setRestaurant(data.restaurant as Restaurant);
      }
      setAreas(data.areas as Area[]);
      setAllTables(data.tables as Table[]);
      setTables(data.tables as Table[]);
      setAllObstacles(data.obstacles as Obstacle[]);
      setObstacles(data.obstacles as Obstacle[]);
      setReservations(data.reservations as Reservation[]);
      setBlocks(data.blocks as Block[]);
      setBlockAssignments(data.block_assignments as BlockAssignment[]);
      setOrders(data.orders as Order[]);
      
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      
      const error = err instanceof Error ? err : new Error('Failed to fetch dashboard data');
      setError(error);
      onError?.(error);
    } finally {
      if (!options.background) {
        setIsLoading(false);
        setIsInitialLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [
    setRestaurant, setAreas, setAllTables, setTables,
    setAllObstacles, setObstacles, setReservations,
    setBlocks, setBlockAssignments, setOrders,
    setIsInitialLoading, onError
  ]);
  
  /**
   * Debounced date change handler
   */
  const setSelectedDate = useCallback((date: Date) => {
    setStoreDate(date);
    
    // Debounce the fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      if (restaurantId) {
        fetchDashboardData(restaurantId, date, { background: true });
      }
    }, 150); // Small delay to batch rapid date changes
  }, [restaurantId, setStoreDate, fetchDashboardData]);
  
  /**
   * Force refresh
   */
  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    await fetchDashboardData(restaurantId, selectedDate);
  }, [restaurantId, selectedDate, fetchDashboardData]);
  
  /**
   * Background refresh (doesn't show loading state)
   */
  const refreshInBackground = useCallback(async () => {
    if (!restaurantId) return;
    lastFetchRef.current = ''; // Force refetch
    await fetchDashboardData(restaurantId, selectedDate, { background: true });
  }, [restaurantId, selectedDate, fetchDashboardData]);
  
  // Initial fetch
  useEffect(() => {
    if (restaurantId) {
      fetchDashboardData(restaurantId, selectedDate);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps -- Only re-run when restaurantId changes
  
  // Refetch when date changes (with debounce already applied in setSelectedDate)
  useEffect(() => {
    // This effect handles external date changes (not from setSelectedDate)
    if (restaurantId && !fetchTimeoutRef.current) {
      fetchDashboardData(restaurantId, selectedDate, { background: true });
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    restaurant,
    areas,
    tables,
    obstacles,
    reservations,
    blocks,
    blockAssignments,
    orders,
    selectedDate,
    isLoading,
    isRefreshing,
    error,
    setSelectedDate,
    refresh,
    refreshInBackground,
  };
}

/**
 * Hook für automatisches Polling im Hintergrund
 */
export function useDashboardPolling(
  refreshFn: () => Promise<void>,
  options: {
    interval?: number;
    enabled?: boolean;
  } = {}
) {
  const { interval = 30000, enabled = true } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    const pollInterval = setInterval(() => {
      refreshFn().catch(console.error);
    }, interval);
    
    return () => clearInterval(pollInterval);
  }, [refreshFn, interval, enabled]);
}

/**
 * Hook für optimierte Uhr-Anzeige (alle 10 Sekunden statt jede Sekunde)
 */
export function useOptimizedClock(updateInterval = 10000) {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    // Initial sync to nearest interval
    const syncToInterval = () => {
      const currentMs = Date.now();
      const nextInterval = Math.ceil(currentMs / updateInterval) * updateInterval;
      return nextInterval - currentMs;
    };
    
    // First update syncs to interval
    const initialTimeout = setTimeout(() => {
      setNow(new Date());
      
      // Then update at regular intervals
      const interval = setInterval(() => {
        setNow(new Date());
      }, updateInterval);
      
      return () => clearInterval(interval);
    }, syncToInterval());
    
    return () => clearTimeout(initialTimeout);
  }, [updateInterval]);
  
  return now;
}
