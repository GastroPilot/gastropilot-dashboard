"use client";

import { useQuery } from "@tanstack/react-query";
import { publicRestaurantsApi, type RestaurantSearchParams } from "@/lib/api/restaurants";

export function useRestaurantSearch(params: RestaurantSearchParams) {
  return useQuery({
    queryKey: ["restaurants", "search", params],
    queryFn: () => publicRestaurantsApi.searchClient(params),
    staleTime: 60 * 1000,
  });
}

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: ["restaurants", slug],
    queryFn: () => publicRestaurantsApi.getBySlugClient(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestaurantMenu(slug: string) {
  return useQuery({
    queryKey: ["restaurants", slug, "menu"],
    queryFn: () => publicRestaurantsApi.getMenuClient(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestaurantReviews(slug: string, page: number = 1) {
  return useQuery({
    queryKey: ["restaurants", slug, "reviews", page],
    queryFn: () => publicRestaurantsApi.getReviewsClient(slug, page),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}
