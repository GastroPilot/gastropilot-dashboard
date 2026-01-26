"use client";

import { useEffect, useState } from "react";
import SnowfallEffect from "@/components/SnowfallEffect";
import { userSettingsApi } from "@/lib/api/user-settings";

const SNOW_KEY = "snow_enabled";
const CONFIRM_KEY = "confirmations_enabled";

export function SnowfallToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await userSettingsApi.getMySettings();
        const snowValue = res?.settings?.[SNOW_KEY];
        const confirmValue = res?.settings?.[CONFIRM_KEY];

        const snowEnabled = snowValue === undefined ? true : Boolean(snowValue);
        const confirmationsEnabled = confirmValue === undefined ? true : Boolean(confirmValue);

        if (!cancelled) {
          setEnabled(snowEnabled);
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(SNOW_KEY, snowEnabled.toString());
          window.localStorage.setItem(CONFIRM_KEY, confirmationsEnabled.toString());
        }
      } catch {
        // Ignoriere Fehler (z. B. nicht eingeloggt) und lasse Standardwert bestehen
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;
  return <SnowfallEffect />;
}
