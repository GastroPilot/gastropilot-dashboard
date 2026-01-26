/**
 * API Client für Gutscheine.
 */
import { api } from "./client";

export interface Voucher {
  id: number;
  restaurant_id: number;
  code: string;
  name: string | null;
  description: string | null;
  type: "fixed" | "percentage";
  value: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  min_order_value: number | null;
  is_active: boolean;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface VoucherCreate {
  restaurant_id: number;
  code: string;
  name?: string | null;
  description?: string | null;
  type: "fixed" | "percentage";
  value: number;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  min_order_value?: number | null;
  is_active?: boolean;
}

export interface VoucherUpdate {
  name?: string | null;
  description?: string | null;
  type?: "fixed" | "percentage";
  value?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  min_order_value?: number | null;
  is_active?: boolean;
}

export interface VoucherValidateResponse {
  valid: boolean;
  voucher?: Voucher;
  discount_amount?: number;
  message: string;
}

class VouchersApi {
  async list(restaurantId: number, includeInactive: boolean = false): Promise<Voucher[]> {
    return api.get<Voucher[]>(
      `/restaurants/${restaurantId}/vouchers?include_inactive=${includeInactive}`
    );
  }

  async get(restaurantId: number, voucherId: number): Promise<Voucher> {
    return api.get<Voucher>(`/restaurants/${restaurantId}/vouchers/${voucherId}`);
  }

  async create(restaurantId: number, data: VoucherCreate): Promise<Voucher> {
    return api.post<Voucher>(`/restaurants/${restaurantId}/vouchers`, data);
  }

  async update(restaurantId: number, voucherId: number, data: VoucherUpdate): Promise<Voucher> {
    return api.put<Voucher>(`/restaurants/${restaurantId}/vouchers/${voucherId}`, data);
  }

  async delete(restaurantId: number, voucherId: number): Promise<void> {
    return api.delete(`/restaurants/${restaurantId}/vouchers/${voucherId}`);
  }

  async validate(
    restaurantId: number,
    code: string,
    reservationAmount?: number
  ): Promise<VoucherValidateResponse> {
    return api.post<VoucherValidateResponse>(
      `/restaurants/${restaurantId}/vouchers/validate`,
      {
        code,
        restaurant_id: restaurantId,
        reservation_amount: reservationAmount,
      }
    );
  }
}

export const vouchersApi = new VouchersApi();
