"use client";

import { create } from "zustand";
import { guestAuthApi, type GuestUser, type GuestLoginRequest, type GuestRegisterRequest } from "@/lib/api/auth";

interface AuthState {
  user: GuestUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (data: GuestLoginRequest) => Promise<void>;
  register: (data: GuestRegisterRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await guestAuthApi.login(data);
      const user = await guestAuthApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Anmeldung fehlgeschlagen";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await guestAuthApi.register(data);
      const user = await guestAuthApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registrierung fehlgeschlagen";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    guestAuthApi.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },

  loadUser: async () => {
    if (!guestAuthApi.isAuthenticated()) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await guestAuthApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      guestAuthApi.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
