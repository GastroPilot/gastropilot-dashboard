import { api } from './client';

export interface Block {
  id: number;
  restaurant_id: number;
  table_id: number | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_by_user_id: number;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface BlockCreate {
  table_id?: number | null;
  start_at: string;
  end_at: string;
  reason?: string | null;
}

export interface BlockUpdate {
  table_id?: number | null;
  start_at?: string;
  end_at?: string;
  reason?: string | null;
}

export const blocksApi = {
  list: async (restaurantId: number): Promise<Block[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Block[]>(`/restaurants/${restaurantId}/blocks/`);
  },

  create: async (restaurantId: number, data: BlockCreate): Promise<Block> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Block>(`/restaurants/${restaurantId}/blocks/`, data);
  },

  update: async (restaurantId: number, blockId: number, data: BlockUpdate): Promise<Block> => {
    return api.patch<Block>(`/restaurants/${restaurantId}/blocks/${blockId}`, data);
  },

  delete: async (restaurantId: number, blockId: number): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/restaurants/${restaurantId}/blocks/${blockId}`);
  },
};
