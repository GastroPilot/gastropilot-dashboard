"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authApi, User } from "@/lib/api/auth";
import { restaurantsApi } from "@/lib/api/restaurants";
import { impersonation } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { confirmAction } from "@/lib/utils";
import { LogOut, Menu, X, ShieldAlert } from "lucide-react";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>("GastroPilot");
  const [impersonatingName, setImpersonatingName] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Prüfe, ob Token abgelaufen ist und versuche es zu refreshen
      if (authApi.isTokenExpired()) {
        console.log("Token abgelaufen, versuche Refresh...");
        const refreshed = await authApi.refresh();
        if (!refreshed) {
          console.log("Token-Refresh fehlgeschlagen, leite zur Login-Seite weiter");
          router.push("/login");
          setLoading(false);
          return;
        }
      }

      if (!authApi.isAuthenticated()) {
        console.log("Nicht authentifiziert, leite zur Login-Seite weiter");
        router.push("/login");
        setLoading(false);
        return;
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        console.log("Token gefunden:", token ? "Ja" : "Nein");

        const currentUser = await authApi.getCurrentUser();
        console.log("User erfolgreich geladen:", currentUser.operator_number);
        setUser(currentUser);
      } catch (error) {
        console.error("Auth check failed:", error);
        // Bei 401/403: Versuche nochmal zu refreshen
        if (error instanceof Error && (error.message.includes("401") || error.message.includes("403"))) {
          const refreshed = await authApi.refresh();
          if (refreshed) {
            try {
              const currentUser = await authApi.getCurrentUser();
              setUser(currentUser);
              setLoading(false);
              return;
            } catch (retryError) {
              console.error("Auth check nach Refresh fehlgeschlagen:", retryError);
            }
          }
        }
        authApi.logout();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Restaurantname laden – nur wenn Tenant-Kontext vorhanden
    const loadRestaurantName = async () => {
      if (!user) return;
      // Grundstatus: platform_admin ohne Impersonation → "GastroPilot" als Name
      if (user.role === "platform_admin" && !impersonation.isActive()) {
        setRestaurantName("GastroPilot");
        return;
      }
      try {
        const restaurants = await restaurantsApi.list();
        if (restaurants.length > 0) {
          setRestaurantName(restaurants[0].name);
        }
      } catch {
        // ignore
      }
    };
    loadRestaurantName();
  }, [user]);

  useEffect(() => {
    setImpersonatingName(impersonation.getTenantName());
  }, [pathname]);

  const handleStopImpersonation = () => {
    impersonation.stop();
    // Vollständiger Page-Reload damit alle Daten neu geladen werden
    window.location.href = "/dashboard/restaurants";
  };

  useEffect(() => {
    // schliesse Mobile-Menü und Profil-Menü beim Navigieren
    setIsNavOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = useMemo(() => {
    const isGrundstatus = user?.role === "platform_admin" && !impersonation.isActive();
    const canManageTables = user && (user.role === "platform_admin" || user.role === "owner" || user.role === "manager");
    const isOwner = user && (user.role === "platform_admin" || user.role === "owner");
    const canViewAuditLogs = user && (user.role === "platform_admin" || user.role === "owner" || user.role === "manager");

    return [
      {
        href: "/dashboard",
        label: "Dashboard",
        active: pathname === "/dashboard",
        show: true,
      },
      {
        href: "/dashboard/tables",
        label: "Tische verwalten",
        active: pathname?.startsWith("/dashboard/tables"),
        show: !!canManageTables && !isGrundstatus,
      },
      {
        href: "/dashboard/orders",
        label: "Bestellungen",
        active: pathname?.startsWith("/dashboard/orders"),
        show: !!user && !isGrundstatus,
      },
      {
        href: "/dashboard/kitchen",
        label: "Küchen-Ansicht",
        active: pathname?.startsWith("/dashboard/kitchen"),
        show: !!user && !isGrundstatus,
      },
      {
        href: "/dashboard/order-statistics",
        label: "Bestellstatistiken",
        active: pathname?.startsWith("/dashboard/order-statistics"),
        show: !!user && user.role === "manager" && !isGrundstatus,
      },
      {
        href: "/dashboard/order-history",
        label: "Bestellhistorie",
        active: pathname?.startsWith("/dashboard/order-history"),
        show: !!user && !isGrundstatus,
      },
      {
        href: "/dashboard/menu",
        label: "Menü verwalten",
        active: pathname?.startsWith("/dashboard/menu"),
        show: !!canManageTables && !isGrundstatus,
      },
      {
        href: "/dashboard/vouchers",
        label: "Gutscheine",
        active: pathname?.startsWith("/dashboard/vouchers"),
        show: !!isOwner && !isGrundstatus,
      },
      {
        href: "/dashboard/upsell-packages",
        label: "Upsell-Pakete",
        active: pathname?.startsWith("/dashboard/upsell-packages"),
        show: !!isOwner && !isGrundstatus,
      },
      {
        href: "/dashboard/restaurants",
        label: "Tenants",
        active: pathname === "/dashboard/restaurants",
        show: user?.role === "platform_admin",
      },
      {
        href: "/dashboard/tenant-settings",
        label: "Restaurant-Einstellungen",
        active: pathname === "/dashboard/tenant-settings",
        show: !!(user && (user.role === "platform_admin" || user.role === "owner" || user.role === "manager")) && !isGrundstatus,
      },
      {
        href: "/dashboard/operators",
        label: "Bedienerverwaltung",
        active: pathname === "/dashboard/operators",
        show: !!isOwner && !isGrundstatus,
      },
      {
        href: "/dashboard/owner-insights",
        label: "Kennzahlen",
        active: pathname?.startsWith("/dashboard/owner-insights"),
        show: !!isOwner && !isGrundstatus,
      },
      {
        href: "/dashboard/hilfecenter",
        label: "Hilfecenter",
        active: pathname?.startsWith("/dashboard/hilfecenter"),
        show: !!user,
      },
      {
        href: "/dashboard/user-settings",
        label: "Benutzereinstellungen",
        active: pathname === "/dashboard/user-settings",
        show: !!user,
      },
      {
        href: "/dashboard/audit-logs",
        label: "Audit-Logs",
        active: pathname === "/dashboard/audit-logs",
        show: !!canViewAuditLogs,
      },
    ].filter((link) => link.show);
  }, [pathname, user]);

  const groupedNav = useMemo(() => {
    const map = new Map(navLinks.map((link) => [link.href, link]));
    const pick = (href: string) => map.get(href) ?? null;
    const groups = [
      {
        title: "TAGESGESCHÄFT",
        items: [
          pick("/dashboard"),
          pick("/dashboard/tables"),
          pick("/dashboard/orders"),
          pick("/dashboard/kitchen"),
          pick("/dashboard/menu"),
          pick("/dashboard/order-statistics"),
          pick("/dashboard/order-history"),
          pick("/dashboard/hilfecenter"),
        ],
      },
      {
        title: "VERWALTUNG",
        items: [
          pick("/dashboard/restaurants"),
          pick("/dashboard/tenant-settings"),
          pick("/dashboard/operators"),
          pick("/dashboard/vouchers"),
          pick("/dashboard/upsell-packages"),
          pick("/dashboard/owner-insights"),
        ],
      },
      {
        title: "SYSTEM",
        items: [
          pick("/dashboard/user-settings"),
          pick("/dashboard/audit-logs"),
        ],
      },
    ].map((group) => ({
      ...group,
      items: group.items.filter(Boolean) as typeof navLinks,
    }));
    return groups.filter((g) => g.items.length > 0);
  }, [navLinks]);

  const userInitials = useMemo(() => {
    if (!user) return "??";
    const first = user.first_name?.[0] ?? "";
    const last = user.last_name?.[0] ?? "";
    const fallback = user.operator_number ? String(user.operator_number).slice(-2) : "";
    const initials = `${first}${last}`.trim() || fallback;
    return initials.toUpperCase() || "??";
  }, [user]);

  const handleLogout = () => {
    const confirmed = confirmAction("Möchtest du dich wirklich abmelden?");
    if (!confirmed) return;
    authApi.logout();
    router.push("/login");
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <nav className="relative bg-card border-b border-border shrink-0">
        <div className="relative w-full px-3 sm:px-4 md:px-5">
          <div className="h-14 md:h-16 flex items-center justify-center">
            <div className="absolute inset-y-0 left-3 sm:left-4 md:left-6 flex items-center">
              <Link
                href="/dashboard"
                className="flex-shrink-0 flex items-center space-x-3 md:space-x-4"
              >
                <Logo size="md" />
                <div className="leading-tight">
                  <div className="text-sm md:text-base font-semibold text-foreground">
                    {restaurantName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Restaurantmanagement
                  </div>
                </div>
              </Link>
            </div>
            <div className="absolute inset-y-0 right-3 sm:right-4 md:right-6 flex items-center space-x-3 md:space-x-4">
              <button
                type="button"
                className="sm:hidden inline-flex items-center justify-center rounded-md border border-border bg-card p-2 text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={isNavOpen ? "Navigation schliessen" : "Navigation öffnen"}
                aria-expanded={isNavOpen}
                onClick={() => setIsNavOpen((prev) => !prev)}
              >
                {isNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <ThemeSwitch />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="touch-manipulation min-h-[36px] md:min-h-[40px] gap-2"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </Button>
              <div className="hidden sm:block relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center justify-center h-10 w-10 rounded-full border border-primary/30 bg-gradient-to-br from-[#F95100] to-[#E04800] text-white shadow-md shadow-[#F95100]/20 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background hover:scale-[1.04] hover:-translate-y-[1px] hover:shadow-lg ${
                    isProfileMenuOpen ? "shadow-lg ring-2 ring-ring" : ""
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <span className="text-sm font-semibold">{userInitials}</span>
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-card shadow-xl z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-sm font-semibold text-foreground">
                        {user ? `${user.first_name} ${user.last_name}` : "Profil"}
                      </div>
                      {user && (
                        <div className="text-xs text-muted-foreground">#{user.operator_number} • {user.role}</div>
                      )}
                    </div>
                    <div className="py-3 space-y-3">
                      {groupedNav.map((group) => (
                        <div key={group.title} className="px-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1 mb-1">
                            {group.title}
                          </div>
                          <div className="space-y-1">
                            {group.items.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
                                  link.active
                                    ? "bg-primary/10 text-foreground border border-primary/60 shadow-sm"
                                    : "text-foreground hover:bg-accent border border-transparent"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${link.active ? "bg-[#F95100] shadow-[0_0_0_3px_rgba(249,81,0,0.25)]" : "bg-muted-foreground/40"}`} />
                                  <span>{link.label}</span>
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mobile Nav */}
        {isNavOpen && (
          <>
            <div
              className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-[1px] z-30"
              onClick={() => setIsNavOpen(false)}
              aria-hidden="true"
            />
            <div className="sm:hidden absolute top-full left-0 w-full z-40 bg-card border-b border-border shadow-lg">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      link.active
                        ? "bg-accent text-foreground border border-primary"
                        : "text-foreground hover:bg-accent border border-transparent"
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.active && <span className="text-xs text-primary">aktiv</span>}
                  </Link>
                ))}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={handleLogout}
                  >
                    Abmelden
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Impersonation-Banner */}
      {impersonatingName && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              Du impersonierst gerade: <strong className="font-semibold">{impersonatingName}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleStopImpersonation}
            className="flex-shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            Beenden
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden min-h-0">{children}</main>
    </div>
  );
}
