import { api } from './client';

export interface BlockAssignment {
  id: number;
  block_id: number;
  table_id: number;
  created_at_utc: string;
}

export interface BlockAssignmentCreate {
  block_id: number;
  table_id: number;
}

export const blockAssignmentsApi = {
  list: async (restaurantId: number): Promise<BlockAssignment[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<BlockAssignment[]>(`/restaurants/${restaurantId}/block-assignments/`);
  },

  create: async (restaurantId: number, data: BlockAssignmentCreate): Promise<BlockAssignment> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<BlockAssignment>(`/restaurants/${restaurantId}/block-assignments/`, data);
  },

  delete: async (restaurantId: number, assignmentId: number): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(
      `/restaurants/${restaurantId}/block-assignments/${assignmentId}`
    );
  },
};
