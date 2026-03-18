/**
 * API Client for QR code management.
 */
import { api } from "./client";

export interface QrCodeResponse {
  table_id: string;
  table_number: string;
  token: string;
  order_url: string;
  qr_svg: string;
}

export interface RegenerateTokenResponse {
  table_id: string;
  token: string;
  message: string;
}

export interface TableInfo {
  id: string;
  number: string;
  capacity: number;
  shape: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  is_active: boolean;
  is_joinable: boolean;
  is_outdoor: boolean;
  area_id: string | null;
}

class QrCodesApi {
  async getQrCode(tableId: string): Promise<QrCodeResponse> {
    return api.get<QrCodeResponse>(`/tables/${tableId}/qr-code`);
  }

  async regenerateToken(tableId: string): Promise<RegenerateTokenResponse> {
    return api.post<RegenerateTokenResponse>(
      `/tables/${tableId}/regenerate-token`
    );
  }

  async listTables(restaurantId: string): Promise<TableInfo[]> {
    return api.get<TableInfo[]>(`/restaurants/${restaurantId}/tables`);
  }
}

export const qrCodesApi = new QrCodesApi();
