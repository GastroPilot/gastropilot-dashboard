import { api, refreshToken } from "./client";

export interface GuestLoginRequest {
  email: string;
  password: string;
}

export interface GuestRegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  allergen_ids?: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface GuestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  allergen_ids: string[];
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const guestAuthApi = {
  register: async (data: GuestRegisterRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/public/auth/register", data);
    if (typeof window !== "undefined") {
      localStorage.setItem("guest_access_token", response.access_token);
      localStorage.setItem("guest_refresh_token", response.refresh_token);
      const expiresIn = response.expires_in || 3600;
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem("guest_token_expires_at", expiresAt.toString());
    }
    return response;
  },

  login: async (data: GuestLoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/public/auth/login", data);
    if (typeof window !== "undefined") {
      localStorage.setItem("guest_access_token", response.access_token);
      localStorage.setItem("guest_refresh_token", response.refresh_token);
      const expiresIn = response.expires_in || 3600;
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem("guest_token_expires_at", expiresAt.toString());
    }
    return response;
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.post("/public/auth/verify-email", { token });
  },

  refresh: async (): Promise<TokenResponse | null> => {
    if (typeof window === "undefined") return null;

    const newAccessToken = await refreshToken();
    if (!newAccessToken) return null;

    const storedRefreshToken = localStorage.getItem("guest_refresh_token");
    const expiresAt = localStorage.getItem("guest_token_expires_at");
    const expiresIn = expiresAt ? Math.floor((parseInt(expiresAt, 10) - Date.now()) / 1000) : 3600;

    return {
      access_token: newAccessToken,
      refresh_token: storedRefreshToken || "",
      token_type: "bearer",
      expires_in: expiresIn,
    };
  },

  getCurrentUser: async (): Promise<GuestUser> => {
    return api.get<GuestUser>("/public/me");
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("guest_access_token");
      localStorage.removeItem("guest_refresh_token");
      localStorage.removeItem("guest_token_expires_at");
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post("/public/auth/forgot-password", { email });
  },

  resetPassword: async (token: string, new_password: string): Promise<void> => {
    await api.post("/public/auth/reset-password", { token, new_password });
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("guest_access_token");
    if (!token) return false;

    const expiresAt = localStorage.getItem("guest_token_expires_at");
    if (expiresAt) {
      const expiresAtMs = parseInt(expiresAt, 10);
      if (Date.now() >= expiresAtMs) {
        return !!localStorage.getItem("guest_refresh_token");
      }
    }

    return true;
  },
};
