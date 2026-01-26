import { useQuery } from '@tanstack/react-query';
import { dashboardApi, DashboardData, KitchenData, InsightsData } from '@/lib/api/dashboard';
import { useDashboardDataStore } from '@/lib/stores/dashboard-store';
import { useEffect } from 'react';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  batch: (restaurantId: number, date?: string) =>
    [...dashboardKeys.all, 'batch', restaurantId, date] as const,
  kitchen: (restaurantId: number) =>
    [...dashboardKeys.all, 'kitchen', restaurantId] as const,
  insights: (restaurantId: number, from?: string, to?: string) =>
    [...dashboardKeys.all, 'insights', restaurantId, from, to] as const,
};

/**
 * Hook to fetch all dashboard data in a single request.
 * 
 * This is the recommended way to load dashboard data as it:
 * - Reduces API calls from 10+ to 1
 * - Improves load time significantly
 * - Syncs data to the Zustand store automatically
 */
export function useDashboardData(restaurantId: number | undefined, date?: Date) {
  const dateStr = date?.toISOString().split('T')[0];
  
  const {
    setRestaurant,
    setAreas,
    setAllTables,
    setAllObstacles,
    setReservations,
    setBlocks,
    setBlockAssignments,
    setOrders,
  } = useDashboardDataStore();
  
  const query = useQuery({
    queryKey: dashboardKeys.batch(restaurantId!, dateStr),
    queryFn: () => dashboardApi.getDashboardData(restaurantId!, date),
    enabled: !!restaurantId,
    staleTime: 10 * 1000, // 10 seconds
  });
  
  // Sync data to Zustand store when it changes
  useEffect(() => {
    if (query.data) {
      setRestaurant(query.data.restaurant);
      setAreas(query.data.areas);
      setAllTables(query.data.tables);
      setAllObstacles(query.data.obstacles);
      setReservations(query.data.reservations);
      setBlocks(query.data.blocks);
      setBlockAssignments(query.data.block_assignments);
      setOrders(query.data.orders);
    }
  }, [query.data, setRestaurant, setAreas, setAllTables, setAllObstacles, setReservations, setBlocks, setBlockAssignments, setOrders]);
  
  return query;
}

/**
 * Hook to fetch kitchen view data.
 * 
 * Optimized for kitchen display with:
 * - More frequent refetching
 * - Only active orders
 */
export function useKitchenData(restaurantId: number | undefined) {
  return useQuery({
    queryKey: dashboardKeys.kitchen(restaurantId!),
    queryFn: () => dashboardApi.getKitchenData(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 5 * 1000, // 5 seconds - kitchen needs fresh data
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  });
}

/**
 * Hook to fetch insights/analytics data.
 */
export function useInsightsData(
  restaurantId: number | undefined,
  options?: { fromDate?: Date; toDate?: Date }
) {
  const fromStr = options?.fromDate?.toISOString().split('T')[0];
  const toStr = options?.toDate?.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: dashboardKeys.insights(restaurantId!, fromStr, toStr),
    queryFn: () => dashboardApi.getInsightsData(restaurantId!, options),
    enabled: !!restaurantId,
    staleTime: 60 * 1000, // 1 minute - analytics can be slightly stale
  });
}
