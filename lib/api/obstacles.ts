import { api } from './client';

export interface Obstacle {
  id: number;
  restaurant_id: number;
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
  area_id?: number | null;
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
  area_id?: number | null;
}

export interface ObstacleUpdate extends Partial<ObstacleCreate> {}

export const obstaclesApi = {
  async list(restaurantId: number): Promise<Obstacle[]> {
    return api.get(`/restaurants/${restaurantId}/obstacles/`);
  },
  async create(restaurantId: number, data: ObstacleCreate): Promise<Obstacle> {
    return api.post(`/restaurants/${restaurantId}/obstacles/`, data);
  },
  async update(restaurantId: number, obstacleId: number, data: ObstacleUpdate): Promise<Obstacle> {
    return api.patch(`/restaurants/${restaurantId}/obstacles/${obstacleId}`, data);
  },
  async delete(restaurantId: number, obstacleId: number): Promise<void> {
    await api.delete(`/restaurants/${restaurantId}/obstacles/${obstacleId}`);
  },
};
