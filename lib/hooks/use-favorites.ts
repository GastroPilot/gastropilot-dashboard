"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesApi } from "@/lib/api/favorites";
import { useAuth } from "@/lib/hooks/use-auth";

export function useFavorites() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesApi.list(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useFavoriteIds() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["favorite-ids"],
    queryFn: () => favoritesApi.getIds(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    select: (data) => new Set(data),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      isFavorite,
    }: {
      restaurantId: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await favoritesApi.remove(restaurantId);
      } else {
        await favoritesApi.add(restaurantId);
      }
    },
    onMutate: async ({ restaurantId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ["favorite-ids"] });
      const prev = queryClient.getQueryData<string[]>(["favorite-ids"]);

      queryClient.setQueryData<string[]>(["favorite-ids"], (old) => {
        if (!old) return isFavorite ? [] : [restaurantId];
        return isFavorite
          ? old.filter((id) => id !== restaurantId)
          : [...old, restaurantId];
      });

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["favorite-ids"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
