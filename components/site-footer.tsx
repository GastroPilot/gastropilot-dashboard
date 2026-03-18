"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const APP_VERSION_RAW = (process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0").trim();

function formatVersion(raw: string): string {
  const bare = raw.startsWith("v") ? raw.slice(1) : raw;
  // Fallback: Commit-Hash kürzen (sollte durch CI nicht mehr vorkommen)
  if (/^[0-9a-f]{40}$/i.test(bare)) {
    return `v${bare.slice(0, 7)}`;
  }
  return raw.startsWith("v") ? raw : `v${raw}`;
}

const APP_VERSION = formatVersion(APP_VERSION_RAW);

/**
 * Ermittelt das Environment basierend auf der Domain.
 * - localhost → Development
 * - test.gpilot.app → Test
 * - stage.gpilot.app → Stage
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
      case "stage":
        return "Stage";
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

  const isAuthPage = useMemo(() => {
    if (!pathname) return false;
    return ["/login", "/login-nfc"].some((p) => pathname.startsWith(p));
  }, [pathname]);

  const currentYear = new Date().getFullYear();

  const displayVersion = environment
    ? `${APP_VERSION}-${environment}`
    : APP_VERSION;

  const versionContent = (
    <>
      <span className={environment ? `font-medium ${
        environment === "Development" ? "text-[#F95100]" :
        environment === "Test" ? "text-yellow-500" :
        environment === "Stage" ? "text-orange-500" :
        environment === "Demo" ? "text-purple-500" :
        "text-muted-foreground"
      }` : ""}>
        Version {displayVersion}
      </span>
      <span className="text-muted-foreground/50">|</span>
      <span className="font-semibold">Servecta @ {currentYear}</span>
    </>
  );

  if (isAuthPage) {
    return (
      <footer className="fixed bottom-0 inset-x-0 py-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {versionContent}
      </footer>
    );
  }

  return (
    <footer className="bg-card border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-2 text-muted-foreground">
        {versionContent}
      </div>
    </footer>
  );
}
