/**
 * API Client für Gutscheine.
 */
import { api } from "./client";

export interface Voucher {
  id: string;
  restaurant_id: string;
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
  restaurant_id: string;
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
  async list(_restaurantId: string, includeInactive: boolean = false): Promise<Voucher[]> {
    return api.get<Voucher[]>(`/vouchers?include_inactive=${includeInactive}`);
  }

  async get(_restaurantId: string, voucherId: string): Promise<Voucher> {
    return api.get<Voucher>(`/vouchers/${voucherId}`);
  }

  async create(_restaurantId: string, data: VoucherCreate): Promise<Voucher> {
    return api.post<Voucher>("/vouchers", data);
  }

  async update(_restaurantId: string, voucherId: string, data: VoucherUpdate): Promise<Voucher> {
    return api.put<Voucher>(`/vouchers/${voucherId}`, data);
  }

  async delete(_restaurantId: string, voucherId: string): Promise<void> {
    return api.delete(`/vouchers/${voucherId}`);
  }

  async validate(
    _restaurantId: string,
    code: string,
    reservationAmount?: number
  ): Promise<VoucherValidateResponse> {
    return api.post<VoucherValidateResponse>("/vouchers/validate", {
      code,
      reservation_amount: reservationAmount,
    });
  }
}

export const vouchersApi = new VouchersApi();
