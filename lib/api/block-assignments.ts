import { api } from "./client";

export interface BlockAssignment {
  id: string;
  block_id: string;
  table_id: string;
  created_at_utc: string;
}

export interface BlockAssignmentCreate {
  restaurant_id?: string | null;
  block_id: string;
  table_id: string;
}

export const blockAssignmentsApi = {
  list: async (_restaurantId: string): Promise<BlockAssignment[]> => {
    return api.get<BlockAssignment[]>(`/blocks/assignments`);
  },

  create: async (
    restaurantId: string,
    data: BlockAssignmentCreate
  ): Promise<BlockAssignment> => {
    return api.post<BlockAssignment>(`/blocks/assignments`, {
      ...data,
      restaurant_id: restaurantId,
    });
  },

  delete: async (_restaurantId: string, assignmentId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/blocks/assignments/${assignmentId}`);
  },
};
