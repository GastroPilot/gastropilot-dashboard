import { api } from "./client";

export interface TableDayConfig {
  id: number;
  restaurant_id: number;
  table_id: number | null;
  date: string;
  is_hidden: boolean;
  is_temporary: boolean;
  number: string | null;
  capacity: number | null;
  shape: string | null;
  notes: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  is_active: boolean | null;
  color: string | null;
  join_group_id: number | null;
  is_joinable: boolean | null;
  rotation: number | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface TableDayConfigCreate {
  table_id?: number | null;
  date: string;
  is_hidden?: boolean | null;
  is_temporary?: boolean | null;
  number?: string | null;
  capacity?: number | null;
  shape?: string | null;
  notes?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  is_active?: boolean | null;
  color?: string | null;
  join_group_id?: number | null;
  is_joinable?: boolean | null;
  rotation?: number | null;
}

export interface TableDayConfigUpdate {
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  is_active?: boolean | null;
  color?: string | null;
  join_group_id?: number | null;
  is_joinable?: boolean | null;
  rotation?: number | null;
}

export const tableDayConfigsApi = {
  getByDate: async (restaurantId: number, date: string): Promise<TableDayConfig[]> => {
    return api.get<TableDayConfig[]>(`/restaurants/${restaurantId}/table-day-configs/by-date/${date}`);
  },

  createOrUpdate: async (
    restaurantId: number,
    data: TableDayConfigCreate
  ): Promise<TableDayConfig> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<TableDayConfig>(`/restaurants/${restaurantId}/table-day-configs/`, data);
  },

  update: async (
    restaurantId: number,
    configId: number,
    data: TableDayConfigUpdate
  ): Promise<TableDayConfig> => {
    return api.patch<TableDayConfig>(
      `/restaurants/${restaurantId}/table-day-configs/${configId}`,
      data
    );
  },

  delete: async (
    restaurantId: number,
    date: string,
    tableId: number
  ): Promise<void> => {
    return api.delete(
      `/restaurants/${restaurantId}/table-day-configs/by-date/${date}/table/${tableId}`
    );
  },

  deleteById: async (
    restaurantId: number,
    configId: number
  ): Promise<void> => {
    return api.delete(
      `/restaurants/${restaurantId}/table-day-configs/${configId}`
    );
  },

  deleteAllForDate: async (
    restaurantId: number,
    date: string
  ): Promise<void> => {
    return api.delete(
      `/restaurants/${restaurantId}/table-day-configs/by-date/${date}`
    );
  },
};

