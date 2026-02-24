import { api } from "./client";

export interface ReservationTableDayConfig {
  reservation_id: string;
  table_day_config_id: string;
  start_at: string;
  end_at: string;
}

export interface ReservationTableDayConfigCreate {
  reservation_id: string;
  table_day_config_id: string;
  start_at: string;
  end_at: string;
}

export const reservationTableDayConfigsApi = {
  list: async (restaurantId: string): Promise<ReservationTableDayConfig[]> => {
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<ReservationTableDayConfig[]>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/`
    );
  },

  create: async (
    restaurantId: string,
    data: ReservationTableDayConfigCreate
  ): Promise<ReservationTableDayConfig> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<ReservationTableDayConfig>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/`,
      data
    );
  },

  delete: async (
    restaurantId: string,
    reservationId: string,
    tableDayConfigId: string
  ): Promise<void> => {
    return api.delete(
      `/restaurants/${restaurantId}/reservation-table-day-configs/?reservation_id=${reservationId}&table_day_config_id=${tableDayConfigId}`
    );
  },

  getByReservation: async (
    restaurantId: string,
    reservationId: string
  ): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/by-reservation/${reservationId}`
    );
  },

  getByTableDayConfig: async (
    restaurantId: string,
    tableDayConfigId: string
  ): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>(
      `/restaurants/${restaurantId}/reservation-table-day-configs/by-table-day-config/${tableDayConfigId}`
    );
  },
};

