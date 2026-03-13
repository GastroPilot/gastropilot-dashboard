/**
 * API Client für Upsell-Pakete.
 */
import { api } from "./client";

export interface UpsellPackage {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  available_from_date: string | null;
  available_until_date: string | null;
  min_party_size: number | null;
  max_party_size: number | null;
  available_times: Record<string, string[]> | null; // {"monday": ["18:00", "19:00"], ...}
  available_weekdays: number[] | null; // [0,1,2,3,4,5,6] für Mo-So
  image_url: string | null;
  display_order: number;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface UpsellPackageCreate {
  restaurant_id: string;
  name: string;
  description?: string | null;
  price: number;
  is_active?: boolean;
  available_from_date?: string | null;
  available_until_date?: string | null;
  min_party_size?: number | null;
  max_party_size?: number | null;
  available_times?: Record<string, string[]> | null;
  available_weekdays?: number[] | null;
  image_url?: string | null;
  display_order?: number;
}

export interface UpsellPackageUpdate {
  name?: string;
  description?: string | null;
  price?: number;
  is_active?: boolean;
  available_from_date?: string | null;
  available_until_date?: string | null;
  min_party_size?: number | null;
  max_party_size?: number | null;
  available_times?: Record<string, string[]> | null;
  available_weekdays?: number[] | null;
  image_url?: string | null;
  display_order?: number;
}

export interface UpsellPackageAvailabilityResponse {
  packages: UpsellPackage[];
}

class UpsellPackagesApi {
  async list(_restaurantId: string, includeInactive: boolean = false): Promise<UpsellPackage[]> {
    return api.get<UpsellPackage[]>(
      `/upsell-packages/?include_inactive=${includeInactive}`
    );
  }

  async get(_restaurantId: string, packageId: string): Promise<UpsellPackage> {
    return api.get<UpsellPackage>(`/upsell-packages/${packageId}`);
  }

  async create(_restaurantId: string, data: UpsellPackageCreate): Promise<UpsellPackage> {
    return api.post<UpsellPackage>(`/upsell-packages/`, data);
  }

  async update(
    _restaurantId: string,
    packageId: string,
    data: UpsellPackageUpdate
  ): Promise<UpsellPackage> {
    return api.put<UpsellPackage>(`/upsell-packages/${packageId}`, data);
  }

  async delete(_restaurantId: string, packageId: string): Promise<void> {
    return api.delete(`/upsell-packages/${packageId}`);
  }

  async getAvailability(
    _restaurantId: string,
    date: string,
    time: string,
    partySize: number
  ): Promise<UpsellPackageAvailabilityResponse> {
    const packages = await api.post<UpsellPackage[]>(
      `/upsell-packages/availability`,
      {
        date,
        time,
        party_size: partySize,
      }
    );
    return { packages };
  }
}

export const upsellPackagesApi = new UpsellPackagesApi();
