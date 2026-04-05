import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tablesApi, Table, TableCreate, TableUpdate } from '@/lib/api/tables';
import { useDashboardDataStore } from '@/lib/stores/dashboard-store';

export const tableKeys = {
  all: ['tables'] as const,
  lists: () => [...tableKeys.all, 'list'] as const,
  list: (restaurantId: string) => [...tableKeys.lists(), restaurantId] as const,
  details: () => [...tableKeys.all, 'detail'] as const,
  detail: (restaurantId: string, id: string) =>
    [...tableKeys.details(), restaurantId, id] as const,
};

/**
 * Hook to fetch tables for a restaurant
 */
export function useTables(restaurantId: string | undefined) {
  return useQuery({
    queryKey: tableKeys.list(restaurantId!),
    queryFn: () => tablesApi.list(restaurantId!),
    enabled: !!restaurantId,
  });
}

/**
 * Hook to fetch a single table
 */
export function useTable(restaurantId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: tableKeys.detail(restaurantId!, id!),
    queryFn: () => tablesApi.get(restaurantId!, id!),
    enabled: !!restaurantId && !!id,
  });
}

/**
 * Hook to create a new table
 */
export function useCreateTable() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: TableCreate }) =>
      tablesApi.create(restaurantId, data),
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list(restaurantId) });
    },
  });
}

/**
 * Hook to update a table with optimistic update
 */
export function useUpdateTable() {
  const queryClient = useQueryClient();
  const updateTable = useDashboardDataStore((s) => s.updateTable);
  
  return useMutation({
    mutationFn: ({
      restaurantId,
      id,
      data,
    }: {
      restaurantId: string;
      id: string;
      data: TableUpdate;
    }) => tablesApi.update(restaurantId, id, data),
    onMutate: async ({ id, data }) => {
      // Optimistically update the store
      updateTable(id, data as Partial<Table>);
    },
    onSettled: (_, __, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list(restaurantId) });
    },
  });
}

/**
 * Hook to delete a table
 */
export function useDeleteTable() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ restaurantId, id }: { restaurantId: string; id: string }) =>
      tablesApi.delete(restaurantId, id),
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list(restaurantId) });
    },
  });
}
