import { api } from "./client";

export interface Table {
  id: string;
  restaurant_id: string;
  number: string;
  capacity: number;
  shape: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  rotation?: number | null;
  area_id?: string | null;
  is_active: boolean;
  notes: string | null;
  color: string | null;
  is_joinable?: boolean;
  join_group_id?: string | null;
  is_outdoor?: boolean;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface TableCreate {
  number: string;
  capacity: number;
  shape?: string;
  position_x?: number | null;
  position_y?: number | null;
  width?: number;
  height?: number;
  rotation?: number | null;
  area_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
  color?: string | null;
}

export interface TableUpdate {
  number?: string;
  capacity?: number;
  shape?: string;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  area_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
  color?: string | null;
  is_joinable?: boolean;
  join_group_id?: string | null;
  is_outdoor?: boolean;
}

export const tablesApi = {
  list: async (restaurantId: string): Promise<Table[]> => {
    return api.get<Table[]>(`/restaurants/${restaurantId}/tables`);
  },

  get: async (restaurantId: string, tableId: string): Promise<Table> => {
    return api.get<Table>(`/restaurants/${restaurantId}/tables/${tableId}`);
  },

  create: async (restaurantId: string, data: TableCreate): Promise<Table> => {
    return api.post<Table>(`/restaurants/${restaurantId}/tables`, data);
  },

  update: async (
    restaurantId: string,
    tableId: string,
    data: TableUpdate
  ): Promise<Table> => {
    return api.patch<Table>(`/restaurants/${restaurantId}/tables/${tableId}`, data);
  },

  delete: async (restaurantId: string, tableId: string): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/tables/${tableId}`);
  },

  join: async (restaurantId: string, tableIds: string[]): Promise<Table[]> => {
    if (tableIds.length < 2) {
      throw new Error("Mindestens 2 Tische müssen ausgewählt sein");
    }
    
    // Erstelle eine neue join_group_id (nutze die erste Tisch-ID als Gruppen-ID)
    const groupId = tableIds[0];
    
    // Aktualisiere alle Tische in der Gruppe
    const updates = await Promise.all(
      tableIds.map(tableId =>
        api.patch<Table>(`/restaurants/${restaurantId}/tables/${tableId}`, {
          is_joinable: true,
          join_group_id: groupId,
        })
      )
    );
    
    return updates;
  },

  unjoin: async (restaurantId: string, tableIds: string[]): Promise<Table[]> => {
    // Entferne die Gruppierung von allen Tischen
    const updates = await Promise.all(
      tableIds.map(tableId =>
        api.patch<Table>(`/restaurants/${restaurantId}/tables/${tableId}`, {
          is_joinable: false,
          join_group_id: null,
        })
      )
    );
    
    return updates;
  },
};
