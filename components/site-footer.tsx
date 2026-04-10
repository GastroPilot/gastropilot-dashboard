"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const APP_VERSION_RAW = (process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0").trim();
const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE || (() => { const d = new Date(); return d.toISOString().slice(0, 10).replace(/-/g, "") + "-" + d.toTimeString().slice(0, 8).replace(/:/g, ""); })();

function formatVersion(raw: string): string {
  const bare = raw.startsWith("v") ? raw.slice(1) : raw;
  if (/^[0-9a-f]{40}$/i.test(bare)) {
    return `v${bare.slice(0, 7)}`;
  }
  return raw.startsWith("v") ? raw : `v${raw}`;
}

const APP_VERSION = formatVersion(APP_VERSION_RAW);

function getEnvironment(): string {
  if (typeof window === "undefined") return "prod";

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "dev";
  }

  const dashboardMatch = hostname.match(/^([^-]+)-dashboard\.gpilot\.app$/);
  if (dashboardMatch) {
    const env = dashboardMatch[1].toLowerCase();
    if (["test", "staging", "demo"].includes(env)) return env;
  }

  const gpilotMatch = hostname.match(/^([^.]+)\.gpilot\.app$/);
  if (gpilotMatch) {
    const sub = gpilotMatch[1].toLowerCase();
    if (["test", "staging", "demo"].includes(sub)) return sub;
  }

  return "prod";
}

export function SiteFooter() {
  const pathname = usePathname();
  
  const [environment, setEnvironment] = useState("prod");

  useEffect(() => {
    setEnvironment(getEnvironment());
  }, []);

  const isAuthPage = useMemo(() => {
    if (!pathname) return false;
    return ["/login", "/login-nfc"].some((p) => pathname.startsWith(p));
  }, [pathname]);
  const isDashboardPage = useMemo(() => {
    if (!pathname) return false;
    return pathname.startsWith("/dashboard");
  }, [pathname]);

  const currentYear = new Date().getFullYear();

  const envColors: Record<string, string> = {
    dev: "text-[#F95100]",
    test: "text-yellow-500",
    staging: "text-orange-500",
    demo: "text-purple-500",
    prod: "text-muted-foreground",
  };

  const versionContent = (
    <>
      <span className={`font-medium ${envColors[environment] ?? "text-muted-foreground"}`}>
        {APP_VERSION}-{environment} ({BUILD_DATE})
      </span>
      <span className="text-muted-foreground/50">|</span>
      <span className="font-semibold">Servecta @ {currentYear}</span>
    </>
  );

  if (isAuthPage) {
    return (
      <footer className="border-t border-border bg-card/95 backdrop-blur px-4 py-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {versionContent}
      </footer>
    );
  }

  if (isDashboardPage) {
    return (
      <footer className="border-t border-border bg-card/95 backdrop-blur px-4 py-2 flex items-center justify-start gap-2 text-xs text-muted-foreground">
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
