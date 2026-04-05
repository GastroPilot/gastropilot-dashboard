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
  list: async (_restaurantId: string): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>("/reservation-table-day-configs");
  },

  create: async (
    _restaurantId: string,
    data: ReservationTableDayConfigCreate
  ): Promise<ReservationTableDayConfig> => {
    return api.post<ReservationTableDayConfig>("/reservation-table-day-configs", data);
  },

  delete: async (
    _restaurantId: string,
    reservationId: string,
    tableDayConfigId: string
  ): Promise<void> => {
    return api.delete(
      `/reservation-table-day-configs?reservation_id=${reservationId}&table_day_config_id=${tableDayConfigId}`
    );
  },

  getByReservation: async (
    _restaurantId: string,
    reservationId: string
  ): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>(
      `/reservation-table-day-configs/by-reservation/${reservationId}`
    );
  },

  getByTableDayConfig: async (
    _restaurantId: string,
    tableDayConfigId: string
  ): Promise<ReservationTableDayConfig[]> => {
    return api.get<ReservationTableDayConfig[]>(
      `/reservation-table-day-configs/by-table-day-config/${tableDayConfigId}`
    );
  },
};
