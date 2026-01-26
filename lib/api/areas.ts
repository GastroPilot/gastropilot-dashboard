import { api } from "./client";

export interface Area {
  id: number;
  restaurant_id: number;
  name: string;
  created_at_utc?: string;
  updated_at_utc?: string;
}

export interface AreaCreate {
  name: string;
}

export interface AreaUpdate {
  name?: string;
}

export const areasApi = {
  list: async (restaurantId: number): Promise<Area[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Area[]>(`/restaurants/${restaurantId}/areas/`);
  },

  create: async (restaurantId: number, data: AreaCreate): Promise<Area> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Area>(`/restaurants/${restaurantId}/areas/`, data);
  },

  update: async (restaurantId: number, areaId: number, data: AreaUpdate): Promise<Area> => {
    return api.patch<Area>(`/restaurants/${restaurantId}/areas/${areaId}`, data);
  },

  delete: async (restaurantId: number, areaId: number): Promise<void> => {
    await api.delete(`/restaurants/${restaurantId}/areas/${areaId}`);
  },
};
