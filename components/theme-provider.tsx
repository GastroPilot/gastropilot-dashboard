"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/stores/dashboard-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "light") {
      apply(false);
      return;
    }
    if (theme === "dark") {
      apply(true);
      return;
    }

    // theme === "system"
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    apply(media.matches);
    const listener = () => apply(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  return <>{children}</>;
}
