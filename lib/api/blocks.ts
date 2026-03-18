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
  list: async (_restaurantId: string): Promise<Block[]> => {
    return api.get<Block[]>("/blocks");
  },

  create: async (_restaurantId: string, data: BlockCreate): Promise<Block> => {
    return api.post<Block>("/blocks", data);
  },

  update: async (_restaurantId: string, blockId: string, data: BlockUpdate): Promise<Block> => {
    return api.patch<Block>(`/blocks/${blockId}`, data);
  },

  delete: async (_restaurantId: string, blockId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/blocks/${blockId}`);
  },
};
