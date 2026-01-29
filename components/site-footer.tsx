"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const APP_VERSION_RAW = (process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0-dev").trim();
const APP_VERSION = APP_VERSION_RAW.startsWith("v") ? APP_VERSION_RAW : `v${APP_VERSION_RAW}`;

const AUTH_PATHS = ["/login", "/login-nfc"];

/**
 * Ermittelt das Environment basierend auf der Domain.
 * - localhost → Development
 * - test.gpilot.app → Test
 * - staging.gpilot.app → Staging
 * - demo.gpilot.app → Demo
 * - gpilot.app → Production (wird nicht angezeigt)
 */
function getEnvironment(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "Development";
  }

  // Prüfe auf gpilot.app Subdomains
  const gpilotMatch = hostname.match(/^([^.]+)\.gpilot\.app$/);
  if (gpilotMatch) {
    const subdomain = gpilotMatch[1].toLowerCase();
    switch (subdomain) {
      case "test":
        return "Test";
      case "staging":
        return "Staging";
      case "demo":
        return "Demo";
      default:
        // Kunde-spezifische Subdomain - zeige nichts
        return null;
    }
  }

  // Hauptdomain gpilot.app - Production, zeige nichts
  return null;
}

export function SiteFooter() {
  const pathname = usePathname();
  
  // Environment wird erst nach dem Client-Mount gesetzt, um Hydration-Fehler zu vermeiden
  // SSR und initial Client rendern beide null → keine Hydration-Differenz
  const [environment, setEnvironment] = useState<string | null>(null);
  
  useEffect(() => {
    setEnvironment(getEnvironment());
  }, []);

  const hideFooter = useMemo(() => {
    if (!pathname) return false;
    return AUTH_PATHS.some((authPath) => pathname.startsWith(authPath));
  }, [pathname]);

  if (hideFooter) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-300">
      <div className="flex items-center gap-2 text-gray-400">
        <span>Version {APP_VERSION}</span>
        {environment && (
          <>
            <span className="text-gray-600">|</span>
            <span className={`font-medium ${
              environment === "Development" ? "text-blue-400" :
              environment === "Test" ? "text-yellow-400" :
              environment === "Staging" ? "text-orange-400" :
              environment === "Demo" ? "text-purple-400" :
              "text-gray-400"
            }`}>
              {environment}
            </span>
          </>
        )}
        <span className="text-gray-600">|</span>
        <span className="font-semibold">Servecta @ {currentYear}</span>
      </div>
    </footer>
  );
}
