import { api } from "./client";
import type { GuestUser } from "./auth";
import type { AllergenId } from "@/lib/utils";

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
}

export interface UpdateAllergenProfileRequest {
  allergen_ids: AllergenId[];
}

export const profileApi = {
  /** Profil laden */
  getProfile: async (): Promise<GuestUser> => {
    return api.get<GuestUser>("/public/me");
  },

  /** Profil aktualisieren */
  updateProfile: async (data: UpdateProfileRequest): Promise<GuestUser> => {
    return api.put<GuestUser>("/public/me", data);
  },

  /** Allergen-Profil aktualisieren */
  updateAllergenProfile: async (data: UpdateAllergenProfileRequest): Promise<GuestUser> => {
    return api.put<GuestUser>("/public/me", { allergen_profile: data.allergen_ids });
  },
};
