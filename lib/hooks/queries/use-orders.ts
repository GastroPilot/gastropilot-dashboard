import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, Order, OrderCreate, OrderUpdate, OrderStatus } from '@/lib/api/orders';
import { useDashboardDataStore } from '@/lib/stores/dashboard-store';

// Filter type that matches the API parameters
export interface OrderFilters {
  status?: OrderStatus;
  table_id?: number;
  guest_id?: number;
  reservation_id?: number;
  start_date?: string;
  end_date?: string;
}

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (restaurantId: number, filters?: OrderFilters) =>
    [...orderKeys.lists(), restaurantId, filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (restaurantId: number, id: number) =>
    [...orderKeys.details(), restaurantId, id] as const,
  statistics: (restaurantId: number) =>
    [...orderKeys.all, 'statistics', restaurantId] as const,
};

/**
 * Hook to fetch orders for a restaurant
 */
export function useOrders(restaurantId: number | undefined, filters?: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(restaurantId!, filters),
    queryFn: () => ordersApi.list(restaurantId!, filters),
    enabled: !!restaurantId,
    staleTime: 5 * 1000, // Orders should be very fresh
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch a single order
 */
export function useOrder(restaurantId: number | undefined, id: number | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(restaurantId!, id!),
    queryFn: () => ordersApi.get(restaurantId!, id!),
    enabled: !!restaurantId && !!id,
  });
}

/**
 * Hook to create a new order with optimistic update
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const addOrder = useDashboardDataStore((s) => s.addOrder);
  
  return useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: number; data: OrderCreate }) =>
      ordersApi.create(restaurantId, data),
    onMutate: async ({ restaurantId, data }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      
      // Optimistically add to store with all required Order fields
      const now = new Date().toISOString();
      const tempOrder: Order = {
        id: -Date.now(),
        restaurant_id: restaurantId,
        table_id: data.table_id ?? null,
        guest_id: data.guest_id ?? null,
        reservation_id: data.reservation_id ?? null,
        order_number: null,
        status: 'open',
        party_size: data.party_size ?? null,
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        discount_percentage: null,
        tip_amount: 0,
        total: 0,
        payment_method: null,
        payment_status: 'unpaid',
        split_payments: null,
        notes: data.notes ?? null,
        special_requests: data.special_requests ?? null,
        opened_at: now,
        closed_at: null,
        paid_at: null,
        created_by_user_id: null,
        created_at_utc: now,
        updated_at_utc: now,
      };
      
      addOrder(tempOrder);
      
      return { tempId: tempOrder.id };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Hook to update an order with optimistic update
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const updateOrder = useDashboardDataStore((s) => s.updateOrder);
  
  return useMutation({
    mutationFn: ({
      restaurantId,
      id,
      data,
    }: {
      restaurantId: number;
      id: number;
      data: OrderUpdate;
    }) => ordersApi.update(restaurantId, id, data),
    onMutate: async ({ id, data }) => {
      // Optimistically update the store
      updateOrder(id, data as Partial<Order>);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Hook to delete/cancel an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ restaurantId, id }: { restaurantId: number; id: number }) =>
      ordersApi.delete(restaurantId, id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

// TODO: Implement useOrderStatistics when backend endpoint is available
// export function useOrderStatistics(restaurantId: number | undefined, params?: { from?: string; to?: string }) {
//   return useQuery({
//     queryKey: orderKeys.statistics(restaurantId!),
//     queryFn: () => ordersApi.getStatistics(restaurantId!, params),
//     enabled: !!restaurantId,
//     staleTime: 60 * 1000, // Statistics can be a bit stale
//   });
// }
