import { api } from "./client";

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;  // Preis inkl. MwSt.
  tax_rate: number;  // MwSt-Satz (0.19 = 19%, 0.07 = 7%)
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
  category_id?: string | null;
  name: string;
  description?: string | null;
  price: number;  // Preis inkl. MwSt.
  tax_rate?: number;  // MwSt-Satz (0.19 = 19%, 0.07 = 7%)
  is_available?: boolean;
  sort_order?: number;
  allergens?: string[] | null;
  modifiers?: Array<{
    name: string;
    options: Array<{ name: string; price_diff: number }>;
  }> | null;
}

export interface MenuItemUpdate {
  category_id?: string | null;
  name?: string;
  description?: string | null;
  price?: number;  // Preis inkl. MwSt.
  tax_rate?: number;  // MwSt-Satz (0.19 = 19%, 0.07 = 7%)
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
  listCategories: async (restaurantId: string): Promise<MenuCategory[]> => {
    return api.get<MenuCategory[]>(`/menus/categories`);
  },

  getCategory: async (restaurantId: string, categoryId: string): Promise<MenuCategory> => {
    const categories = await menuApi.listCategories(restaurantId);
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      throw new Error("Kategorie nicht gefunden");
    }
    return category;
  },

  createCategory: async (restaurantId: string, data: MenuCategoryCreate): Promise<MenuCategory> => {
    return api.post<MenuCategory>(`/menus/categories`, data);
  },

  updateCategory: async (
    restaurantId: string,
    categoryId: string,
    data: MenuCategoryUpdate
  ): Promise<MenuCategory> => {
    return api.patch<MenuCategory>(`/menus/categories/${categoryId}`, data);
  },

  deleteCategory: async (restaurantId: string, categoryId: string): Promise<void> => {
    return api.delete(`/menus/categories/${categoryId}`);
  },

  // Items
  listItems: async (
    restaurantId: string,
    params?: { category_id?: string; available_only?: boolean }
  ): Promise<MenuItem[]> => {
    const queryParams = new URLSearchParams();
    if (params?.category_id) queryParams.append("category_id", params.category_id);
    if (params?.available_only) queryParams.append("available_only", "true");

    const query = queryParams.toString();
    return api.get<MenuItem[]>(
      `/menus/items${query ? `?${query}` : ""}`
    );
  },

  getItem: async (restaurantId: string, itemId: string): Promise<MenuItem> => {
    return api.get<MenuItem>(`/menus/items/${itemId}`);
  },

  createItem: async (restaurantId: string, data: MenuItemCreate): Promise<MenuItem> => {
    return api.post<MenuItem>(`/menus/items`, data);
  },

  updateItem: async (
    restaurantId: string,
    itemId: string,
    data: MenuItemUpdate
  ): Promise<MenuItem> => {
    return api.patch<MenuItem>(`/menus/items/${itemId}`, data);
  },

  deleteItem: async (restaurantId: string, itemId: string): Promise<void> => {
    return api.delete(`/menus/items/${itemId}`);
  },
};

