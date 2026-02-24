import { api } from "./client";

export interface Block {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_by_user_id: string;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface BlockCreate {
  table_id?: string | null;
  start_at: string;
  end_at: string;
  reason?: string | null;
}

export interface BlockUpdate {
  table_id?: string | null;
  start_at?: string;
  end_at?: string;
  reason?: string | null;
}

export const blocksApi = {
  list: async (restaurantId: string): Promise<Block[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Block[]>(`/restaurants/${restaurantId}/blocks/`);
  },

  create: async (restaurantId: string, data: BlockCreate): Promise<Block> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Block>(`/restaurants/${restaurantId}/blocks/`, data);
  },

  update: async (restaurantId: string, blockId: string, data: BlockUpdate): Promise<Block> => {
    return api.patch<Block>(`/restaurants/${restaurantId}/blocks/${blockId}`, data);
  },

  delete: async (restaurantId: string, blockId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/restaurants/${restaurantId}/blocks/${blockId}`);
  },
};
