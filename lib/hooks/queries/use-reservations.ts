import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi, Reservation, ReservationCreate, ReservationUpdate, ReservationStatus } from '@/lib/api/reservations';
import { format } from 'date-fns';
import { useDashboardDataStore } from '@/lib/stores/dashboard-store';

// Filter type that matches the API parameters
export interface ReservationFilters {
  from?: string;
  to?: string;
  status?: ReservationStatus;
  table_id?: string;
}

export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (restaurantId: string, filters?: ReservationFilters) =>
    [...reservationKeys.lists(), restaurantId, filters] as const,
  details: () => [...reservationKeys.all, 'detail'] as const,
  detail: (restaurantId: string, id: string) =>
    [...reservationKeys.details(), restaurantId, id] as const,
};

/**
 * Hook to fetch reservations for a restaurant
 */
export function useReservations(restaurantId: string | undefined, date?: Date) {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;
  // Convert date to from/to filter format expected by API
  const filters: ReservationFilters | undefined = dateStr ? { from: dateStr, to: dateStr } : undefined;
  
  return useQuery({
    queryKey: reservationKeys.list(restaurantId!, filters),
    queryFn: () => reservationsApi.list(restaurantId!, filters),
    enabled: !!restaurantId,
    staleTime: 10 * 1000, // Reservations should be more fresh
  });
}

/**
 * Hook to fetch a single reservation
 */
export function useReservation(restaurantId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: reservationKeys.detail(restaurantId!, id!),
    queryFn: () => reservationsApi.get(restaurantId!, id!),
    enabled: !!restaurantId && !!id,
  });
}

/**
 * Hook to create a new reservation with optimistic update
 */
export function useCreateReservation() {
  const queryClient = useQueryClient();
  const addReservation = useDashboardDataStore((s) => s.addReservation);
  
  return useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: ReservationCreate }) =>
      reservationsApi.create(restaurantId, data),
    onMutate: async ({ restaurantId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: reservationKeys.lists() });
      
      // Snapshot previous value
      const dateStr = data.start_at.split('T')[0];
      const previousReservations = queryClient.getQueryData(
        reservationKeys.list(restaurantId, { from: dateStr, to: dateStr })
      );
      
      // Optimistically add to store
      const tempReservation: Reservation = {
        id: `temp-${Date.now()}`, // Temporary string ID
        restaurant_id: restaurantId,
        ...data,
      } as Reservation;
      
      addReservation(tempReservation);
      
return { previousReservations, tempId: tempReservation.id };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.tempId) {
        const removeReservation = useDashboardDataStore.getState().removeReservation;
        removeReservation(context.tempId);
      }
    },
    onSettled: (_, __, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

/**
 * Hook to update a reservation with optimistic update
 */
export function useUpdateReservation() {
  const queryClient = useQueryClient();
  const updateReservation = useDashboardDataStore((s) => s.updateReservation);
  
  return useMutation({
    mutationFn: ({
      restaurantId,
      id,
      data,
    }: {
      restaurantId: string;
      id: string;
      data: ReservationUpdate;
    }) => reservationsApi.update(restaurantId, id, data),
    onMutate: async ({ id, data }) => {
      // Optimistically update the store
      updateReservation(id, data as Partial<Reservation>);
    },
    onSettled: (_, __, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

/**
 * Hook to delete a reservation
 */
export function useDeleteReservation() {
  const queryClient = useQueryClient();
  const removeReservation = useDashboardDataStore((s) => s.removeReservation);
  
  return useMutation({
    mutationFn: ({ restaurantId, id }: { restaurantId: string; id: string }) =>
      reservationsApi.delete(restaurantId, id),
    onMutate: async ({ id }) => {
      // Optimistically remove from store
      removeReservation(id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}
