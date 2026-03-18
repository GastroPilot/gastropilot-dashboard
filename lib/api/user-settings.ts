import { api, ApiError } from "./client";

export interface UserSettings {
  id: string;
  user_id: string;
  settings: Record<string, any>;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface UserSettingsUpdatePayload {
  settings: Record<string, any>;
}

export const userSettingsApi = {
  /**
   * Liefert die Settings des aktuellen Users. Initialisiert serverseitig einen leeren Datensatz,
   * falls noch keiner existiert.
   * Wichtig: MIT trailing slash, da Backend-Route "/" ist (wird zu "/v1/users/me/settings/")
   */
  getMySettings: async (): Promise<UserSettings> => {
    return api.get<UserSettings>("/users/me/settings/");
  },

  /**
   * Mergt die gelieferten Settings in die bestehenden Settings des aktuellen Users.
   * Wichtig: MIT trailing slash, da Backend-Route "/" ist (wird zu "/v1/users/me/settings/")
   */
  updateMySettings: async (data: UserSettingsUpdatePayload): Promise<UserSettings> => {
    try {
      return await api.patch<UserSettings>("/users/me/settings/", data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Unbekannter Fehler beim Aktualisieren der Einstellungen", error);
    }
  },

  /**
   * Entfernt einen einzelnen Setting-Key des aktuellen Users.
   */
  deleteMySettingKey: async (key: string): Promise<UserSettings> => {
    try {
      const encodedKey = encodeURIComponent(key);
      return await api.delete<UserSettings>(`/users/me/settings/${encodedKey}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Unbekannter Fehler beim Löschen der Einstellung", error);
    }
  },
};
