/**
 * API Client für Upsell-Pakete.
 */
import { api } from "./client";

export interface UpsellPackage {
  id: number;
  restaurant_id: number;
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
  restaurant_id: number;
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
  async list(restaurantId: number, includeInactive: boolean = false): Promise<UpsellPackage[]> {
    return api.get<UpsellPackage[]>(
      `/restaurants/${restaurantId}/upsell-packages/?include_inactive=${includeInactive}`
    );
  }

  async get(restaurantId: number, packageId: number): Promise<UpsellPackage> {
    return api.get<UpsellPackage>(`/restaurants/${restaurantId}/upsell-packages/${packageId}`);
  }

  async create(restaurantId: number, data: UpsellPackageCreate): Promise<UpsellPackage> {
    return api.post<UpsellPackage>(`/restaurants/${restaurantId}/upsell-packages`, data);
  }

  async update(
    restaurantId: number,
    packageId: number,
    data: UpsellPackageUpdate
  ): Promise<UpsellPackage> {
    return api.put<UpsellPackage>(
      `/restaurants/${restaurantId}/upsell-packages/${packageId}`,
      data
    );
  }

  async delete(restaurantId: number, packageId: number): Promise<void> {
    return api.delete(`/restaurants/${restaurantId}/upsell-packages/${packageId}`);
  }

  async getAvailability(
    restaurantId: number,
    date: string,
    time: string,
    partySize: number
  ): Promise<UpsellPackageAvailabilityResponse> {
    return api.post<UpsellPackageAvailabilityResponse>(
      `/restaurants/${restaurantId}/upsell-packages/availability`,
      {
        restaurant_id: restaurantId,
        date,
        time,
        party_size: partySize,
      }
    );
  }
}

export const upsellPackagesApi = new UpsellPackagesApi();
