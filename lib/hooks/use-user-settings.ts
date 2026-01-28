import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { userSettingsApi, UserSettings, UserSettingsUpdatePayload } from '../api/user-settings';

type ToastVariant = 'info' | 'error' | 'success';

interface Toast {
  id: string;
  message: string;
  variant?: ToastVariant;
}

export function useUserSettings(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const extractErrorMessage = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      return err.message || 'Fehler beim Laden der Einstellungen';
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Unbekannter Fehler';
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await userSettingsApi.getMySettings();
      setSettings(result);
      return result;
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      addToast(message, 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [addToast, extractErrorMessage]);

  const updateSettings = useCallback(
    async (data: UserSettingsUpdatePayload['settings']) => {
      setIsUpdating(true);
      setError(null);
      try {
        const updated = await userSettingsApi.updateMySettings({ settings: data });
        setSettings(updated);
        return updated;
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        addToast(message, 'error');
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [addToast, extractErrorMessage]
  );

  const deleteSettingKey = useCallback(
    async (key: string) => {
      setIsUpdating(true);
      setError(null);
      try {
        const updated = await userSettingsApi.deleteMySettingKey(key);
        setSettings(updated);
        return updated;
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        addToast(message, 'error');
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [addToast, extractErrorMessage]
  );

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    settings,
    isLoading,
    isUpdating,
    error,
    refresh,
    updateSettings,
    deleteSettingKey,
    toasts,
    addToast,
  };
}
