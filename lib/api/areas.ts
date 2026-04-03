import { api } from "./client";

export interface Area {
  id: string;
  restaurant_id: string;
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
  list: async (restaurantId: string): Promise<Area[]> => {
    return api.get<Area[]>(`/restaurants/${restaurantId}/areas`);
  },

  create: async (restaurantId: string, data: AreaCreate): Promise<Area> => {
    return api.post<Area>(`/restaurants/${restaurantId}/areas`, data);
  },

  update: async (restaurantId: string, areaId: string, data: AreaUpdate): Promise<Area> => {
    return api.patch<Area>(`/restaurants/${restaurantId}/areas/${areaId}`, data);
  },

  delete: async (restaurantId: string, areaId: string): Promise<void> => {
    await api.delete(`/restaurants/${restaurantId}/areas/${areaId}`);
  },
};
