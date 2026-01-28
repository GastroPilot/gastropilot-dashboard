import { api } from './client';

export interface MenuCategory {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number; // Preis inkl. MwSt.
  tax_rate: number; // MwSt-Satz (0.19 = 19%, 0.07 = 7%)
  is_available: boolean;
  sort_order: number | null;
  allergens: string[] | null;
  modifiers: Array<{
    name: string;
    options: Array<{ name: string; price_diff: number }>;
  }> | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface MenuCategoryCreate {
  name: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface MenuCategoryUpdate {
  name?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface MenuItemCreate {
  category_id?: number | null;
  name: string;
  description?: string | null;
  price: number; // Preis inkl. MwSt.
  tax_rate?: number; // MwSt-Satz (0.19 = 19%, 0.07 = 7%)
  is_available?: boolean;
  sort_order?: number;
  allergens?: string[] | null;
  modifiers?: Array<{
    name: string;
    options: Array<{ name: string; price_diff: number }>;
  }> | null;
}

export interface MenuItemUpdate {
  category_id?: number | null;
  name?: string;
  description?: string | null;
  price?: number; // Preis inkl. MwSt.
  tax_rate?: number; // MwSt-Satz (0.19 = 19%, 0.07 = 7%)
  is_available?: boolean;
  sort_order?: number;
  allergens?: string[] | null;
  modifiers?: Array<{
    name: string;
    options: Array<{ name: string; price_diff: number }>;
  }> | null;
}

export const menuApi = {
  // Categories
  listCategories: async (restaurantId: number): Promise<MenuCategory[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<MenuCategory[]>(`/restaurants/${restaurantId}/menu/categories/`);
  },

  getCategory: async (restaurantId: number, categoryId: number): Promise<MenuCategory> => {
    return api.get<MenuCategory>(`/restaurants/${restaurantId}/menu/categories/${categoryId}`);
  },

  createCategory: async (restaurantId: number, data: MenuCategoryCreate): Promise<MenuCategory> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<MenuCategory>(`/restaurants/${restaurantId}/menu/categories/`, data);
  },

  updateCategory: async (
    restaurantId: number,
    categoryId: number,
    data: MenuCategoryUpdate
  ): Promise<MenuCategory> => {
    return api.patch<MenuCategory>(
      `/restaurants/${restaurantId}/menu/categories/${categoryId}`,
      data
    );
  },

  deleteCategory: async (restaurantId: number, categoryId: number): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/menu/categories/${categoryId}`);
  },

  // Items
  listItems: async (
    restaurantId: number,
    params?: { category_id?: number; available_only?: boolean }
  ): Promise<MenuItem[]> => {
    const queryParams = new URLSearchParams();
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    if (params?.available_only) queryParams.append('available_only', 'true');

    const query = queryParams.toString();
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<MenuItem[]>(
      `/restaurants/${restaurantId}/menu/items/${query ? `?${query}` : ''}`
    );
  },

  getItem: async (restaurantId: number, itemId: number): Promise<MenuItem> => {
    return api.get<MenuItem>(`/restaurants/${restaurantId}/menu/items/${itemId}`);
  },

  createItem: async (restaurantId: number, data: MenuItemCreate): Promise<MenuItem> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<MenuItem>(`/restaurants/${restaurantId}/menu/items/`, data);
  },

  updateItem: async (
    restaurantId: number,
    itemId: number,
    data: MenuItemUpdate
  ): Promise<MenuItem> => {
    return api.patch<MenuItem>(`/restaurants/${restaurantId}/menu/items/${itemId}`, data);
  },

  deleteItem: async (restaurantId: number, itemId: number): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/menu/items/${itemId}`);
  },
};
