import { api } from "./client";

export interface Obstacle {
  id: string;
  restaurant_id: string;
  type: string;
  name?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  blocking: boolean;
  color?: string | null;
  notes?: string | null;
  area_id?: string | null;
}

export interface ObstacleCreate {
  type: string;
  name?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  blocking?: boolean;
  color?: string | null;
  notes?: string | null;
  area_id?: string | null;
}

export interface ObstacleUpdate extends Partial<ObstacleCreate> {}

export const obstaclesApi = {
  async list(restaurantId: string): Promise<Obstacle[]> {
    return api.get(`/restaurants/${restaurantId}/obstacles/`);
  },
  async create(restaurantId: string, data: ObstacleCreate): Promise<Obstacle> {
    return api.post(`/restaurants/${restaurantId}/obstacles/`, data);
  },
  async update(restaurantId: string, obstacleId: string, data: ObstacleUpdate): Promise<Obstacle> {
    return api.patch(`/restaurants/${restaurantId}/obstacles/${obstacleId}`, data);
  },
  async delete(restaurantId: string, obstacleId: string): Promise<void> {
    await api.delete(`/restaurants/${restaurantId}/obstacles/${obstacleId}`);
  },
};
