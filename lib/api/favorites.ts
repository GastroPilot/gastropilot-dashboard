import { api } from "./client";

export interface FavoriteRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  cuisine_type: string | null;
  image_url: string | null;
  average_rating: number | null;
  review_count: number;
  favorited_at: string;
}

export const favoritesApi = {
  list: () => api.get<FavoriteRestaurant[]>("/public/me/favorites"),

  getIds: () => api.get<string[]>("/public/me/favorites/ids"),

  add: (restaurantId: string) =>
    api.post<{ message: string }>(`/public/me/favorites/${restaurantId}`),

  remove: (restaurantId: string) =>
    api.delete<void>(`/public/me/favorites/${restaurantId}`),
};
