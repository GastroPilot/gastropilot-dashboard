import { api } from "./client";

export interface TableDayConfig {
  id: string;
  restaurant_id: string;
  table_id: string | null;
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
  join_group_id: string | null;
  is_joinable: boolean | null;
  rotation: number | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface TableDayConfigCreate {
  table_id?: string | null;
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
  join_group_id?: string | null;
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
  join_group_id?: string | null;
  is_joinable?: boolean | null;
  rotation?: number | null;
}

export const tableDayConfigsApi = {
  getByDate: async (_restaurantId: string, date: string): Promise<TableDayConfig[]> => {
    return api.get<TableDayConfig[]>(`/table-day-configs/by-date/${date}`);
  },

  createOrUpdate: async (
    _restaurantId: string,
    data: TableDayConfigCreate
  ): Promise<TableDayConfig> => {
    return api.post<TableDayConfig>("/table-day-configs", data);
  },

  update: async (
    _restaurantId: string,
    configId: string,
    data: TableDayConfigUpdate
  ): Promise<TableDayConfig> => {
    return api.patch<TableDayConfig>(`/table-day-configs/${configId}`, data);
  },

  delete: async (
    _restaurantId: string,
    date: string,
    tableId: string
  ): Promise<void> => {
    return api.delete(`/table-day-configs/by-date/${date}/table/${tableId}`);
  },

  deleteById: async (
    _restaurantId: string,
    configId: string
  ): Promise<void> => {
    return api.delete(`/table-day-configs/${configId}`);
  },

  deleteAllForDate: async (
    _restaurantId: string,
    date: string
  ): Promise<void> => {
    return api.delete(`/table-day-configs/by-date/${date}`);
  },
};
