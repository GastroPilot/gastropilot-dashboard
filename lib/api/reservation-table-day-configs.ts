import { api } from './client';

export interface ReservationTableDayConfig {
  reservation_id: number;
  table_day_config_id: number;
  start_at: string;
  end_at: string;
}

export interface ReservationTableDayConfigCreate {
  reservation_id: number;
  table_day_config_id: number;
  start_at: string;
  end_at: string;
}

export const reservationTableDayConfigsApi = {
  list: async (restaurantId: number): Promise<ReservationTableDayConfig[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<ReservationTableDayConfig[]>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/`
    );
  },

  create: async (
    restaurantId: number,
    data: ReservationTableDayConfigCreate
  ): Promise<ReservationTableDayConfig> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<ReservationTableDayConfig>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/`,
      data
    );
  },

  delete: async (
    restaurantId: number,
    reservationId: number,
    tableDayConfigId: number
  ): Promise<void> => {
    return api.delete(
      `/restaurants/${restaurantId}/reservation-table-day-configs?reservation_id=${reservationId}&table_day_config_id=${tableDayConfigId}`
    );
  },

  getByReservation: async (
    restaurantId: number,
    reservationId: number
  ): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/by-reservation/${reservationId}`
    );
  },

  getByTableDayConfig: async (
    restaurantId: number,
    tableDayConfigId: number
  ): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/by-table-day-config/${tableDayConfigId}`
    );
  },
};
