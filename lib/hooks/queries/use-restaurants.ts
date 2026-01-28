import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  restaurantsApi,
  Restaurant,
  RestaurantCreate,
  RestaurantUpdate,
} from '@/lib/api/restaurants';

export const restaurantKeys = {
  all: ['restaurants'] as const,
  lists: () => [...restaurantKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...restaurantKeys.lists(), filters] as const,
  details: () => [...restaurantKeys.all, 'detail'] as const,
  detail: (id: number) => [...restaurantKeys.details(), id] as const,
};

/**
 * Hook to fetch all restaurants
 */
export function useRestaurants() {
  return useQuery({
    queryKey: restaurantKeys.lists(),
    queryFn: () => restaurantsApi.list(),
  });
}

/**
 * Hook to fetch a single restaurant by ID
 */
export function useRestaurant(id: number | undefined) {
  return useQuery({
    queryKey: restaurantKeys.detail(id!),
    queryFn: () => restaurantsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new restaurant
 */
export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RestaurantCreate) => restaurantsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.lists() });
    },
  });
}

/**
 * Hook to update a restaurant
 */
export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RestaurantUpdate }) =>
      restaurantsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: restaurantKeys.lists() });
    },
  });
}

/**
 * Hook to delete a restaurant
 */
export function useDeleteRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restaurantsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.lists() });
    },
  });
}
