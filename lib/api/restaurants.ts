import { api, serverFetch } from "./client";
import type { AllergenId } from "@/lib/utils";

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  cuisine_type: string | null;
  price_range: number | null; // 1-4
  average_rating: number | null;
  review_count: number;
  image_url: string | null;
  allergen_safe: AllergenId[];
  opening_hours: Record<string, { open: string; close: string }> | null;
  latitude: number | null;
  longitude: number | null;
  public_booking_enabled: boolean;
  booking_max_party_size: number;
}

export interface RestaurantSearchParams {
  query?: string;
  cuisine?: string;
  location?: string;
  allergens?: AllergenId[];
  price_range?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  allergen_ids: AllergenId[];
  image_url: string | null;
  is_available: boolean;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface RestaurantReview {
  id: string;
  author_name: string;
  guest_name: string;
  rating: number;
  title: string | null;
  text: string | null;
  comment: string | null;
  is_verified: boolean;
  staff_reply: string | null;
  staff_reply_at: string | null;
  created_at: string;
}

export const publicRestaurantsApi = {
  /** Suche öffentliche Restaurants (Server-safe) */
  search: async (params: RestaurantSearchParams): Promise<PaginatedResponse<PublicRestaurant>> => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.cuisine) searchParams.set("cuisine", params.cuisine);
    if (params.location) searchParams.set("location", params.location);
    if (params.allergens?.length) searchParams.set("allergens", params.allergens.join(","));
    if (params.price_range) searchParams.set("price_range", params.price_range.toString());
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    const endpoint = `/public/restaurants/${qs ? `?${qs}` : ""}`;
    return serverFetch<PaginatedResponse<PublicRestaurant>>(endpoint);
  },

  /** Suche (Client-seitig mit React Query) */
  searchClient: async (params: RestaurantSearchParams): Promise<PaginatedResponse<PublicRestaurant>> => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.cuisine) searchParams.set("cuisine", params.cuisine);
    if (params.location) searchParams.set("location", params.location);
    if (params.allergens?.length) searchParams.set("allergens", params.allergens.join(","));
    if (params.price_range) searchParams.set("price_range", params.price_range.toString());
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    return api.get<PaginatedResponse<PublicRestaurant>>(`/public/restaurants/${qs ? `?${qs}` : ""}`);
  },

  /** Einzelnes Restaurant laden (Server-safe) */
  getBySlug: async (slug: string): Promise<PublicRestaurant> => {
    return serverFetch<PublicRestaurant>(`/public/restaurants/${slug}`);
  },

  /** Einzelnes Restaurant laden (Client-seitig) */
  getBySlugClient: async (slug: string): Promise<PublicRestaurant> => {
    return api.get<PublicRestaurant>(`/public/restaurants/${slug}`);
  },

  /** Restaurant-Speisekarte laden (Server-safe) */
  getMenu: async (slug: string): Promise<MenuCategory[]> => {
    const data = await serverFetch<{ restaurant: string; categories: any[] }>(
      `/public/restaurants/${slug}/menu`
    );
    return (data.categories || []).map((cat) => ({
      name: cat.name,
      items: (cat.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || null,
        price: item.price || 0,
        category: cat.name,
        allergen_ids: item.allergens || item.allergen_ids || [],
        image_url: item.image_url || null,
        is_available: item.is_available ?? true,
      })),
    }));
  },

  /** Bewertungen laden (Server-safe) */
  getReviews: async (slug: string, page: number = 1): Promise<PaginatedResponse<RestaurantReview>> => {
    return serverFetch<PaginatedResponse<RestaurantReview>>(`/public/restaurants/${slug}/reviews?page=${page}`);
  },

  /** Speisekarte laden (Client-seitig) */
  getMenuClient: async (slug: string): Promise<MenuCategory[]> => {
    const data = await api.get<{ restaurant: string; categories: any[] }>(
      `/public/restaurants/${slug}/menu`
    );
    return (data.categories || []).map((cat) => ({
      name: cat.name,
      items: (cat.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || null,
        price: item.price || 0,
        category: cat.name,
        allergen_ids: item.allergens || item.allergen_ids || [],
        image_url: item.image_url || null,
        is_available: item.is_available ?? true,
      })),
    }));
  },

  /** Bewertungen laden (Client-seitig) */
  getReviewsClient: async (slug: string, page: number = 1): Promise<PaginatedResponse<RestaurantReview>> => {
    return api.get<PaginatedResponse<RestaurantReview>>(`/public/restaurants/${slug}/reviews?page=${page}`);
  },
};

/** Client-seitige Review-API (erfordert Guest-Auth-Token) */
export const reviewsApi = {
  create: async (
    slug: string,
    data: { rating: number; title?: string; text?: string }
  ): Promise<RestaurantReview> => {
    return api.post<RestaurantReview>(
      `/public/restaurants/${slug}/reviews`,
      data
    );
  },
};
