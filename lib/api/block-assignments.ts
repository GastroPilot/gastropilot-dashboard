import { api } from "./client";

export interface BlockAssignment {
  id: string;
  block_id: string;
  table_id: string;
  created_at_utc: string;
}

export interface BlockAssignmentCreate {
  block_id: string;
  table_id: string;
}

export const blockAssignmentsApi = {
  list: async (restaurantId: string): Promise<BlockAssignment[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<BlockAssignment[]>(
      `/restaurants/${restaurantId}/block-assignments/`
    );
  },

  create: async (
    restaurantId: string,
    data: BlockAssignmentCreate
  ): Promise<BlockAssignment> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<BlockAssignment>(
      `/restaurants/${restaurantId}/block-assignments/`,
      data
    );
  },

  delete: async (restaurantId: string, assignmentId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(
      `/restaurants/${restaurantId}/block-assignments/${assignmentId}`
    );
  },
};
