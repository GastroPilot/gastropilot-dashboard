"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authApi, User } from "@/lib/api/auth";
import { restaurantsApi } from "@/lib/api/restaurants";
import { impersonation } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { confirmAction } from "@/lib/utils";
import { LogOut, Menu, X, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { DashboardMobileGroupedNav, DashboardSidebar } from "@/components/dashboard-sidebar-nav";
import { buildDashboardNavLinks, groupDashboardNavLinks } from "@/lib/navigation/dashboard-nav";

const DASHBOARD_SIDEBAR_COLLAPSED_KEY = "dashboard_sidebar_collapsed";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>("GastroPilot");
  const [impersonatingName, setImpersonatingName] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarStateLoadedRef = useRef(false);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
      }
      if (isNavOpen) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isProfileMenuOpen, isNavOpen]);

  const navLinks = useMemo(() => {
    const isGrundstatus = user?.role === "platform_admin" && !impersonation.isActive();
    return buildDashboardNavLinks({ pathname, user, isGrundstatus });
  }, [pathname, user]);

  const groupedNav = useMemo(() => {
    return groupDashboardNavLinks(navLinks);
  }, [navLinks]);
  const userSettingsLink = useMemo(() => {
    return navLinks.find((link) => link.href === "/dashboard/user-settings") ?? null;
  }, [navLinks]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;

    sidebarStateLoadedRef.current = false;
    const key = `${DASHBOARD_SIDEBAR_COLLAPSED_KEY}:${user.id}`;
    const stored = window.localStorage.getItem(key);

    if (stored === "1" || stored === "0") {
      setIsSidebarCollapsed(stored === "1");
    } else {
      setIsSidebarCollapsed(false);
    }

    sidebarStateLoadedRef.current = true;
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    if (!sidebarStateLoadedRef.current) return;

    const key = `${DASHBOARD_SIDEBAR_COLLAPSED_KEY}:${user.id}`;
    window.localStorage.setItem(key, isSidebarCollapsed ? "1" : "0");
  }, [user?.id, isSidebarCollapsed]);

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
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      <nav className="relative bg-card border-b border-border shrink-0">
        <div className="w-full px-3 sm:px-4 md:px-5">
          <div className="min-h-14 md:h-16 py-2 md:py-0 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <Link
              href="/dashboard"
              className="min-w-0 flex flex-1 items-center gap-2 sm:gap-3 md:gap-4"
            >
              <Logo size="md" />
              <div className="min-w-0 leading-tight">
                <div className="text-sm md:text-base font-semibold text-foreground truncate">
                  {restaurantName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Restaurantmanagement
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
              <ThemeSwitch />
              <button
                type="button"
                className="sm:hidden inline-flex items-center justify-center rounded-md border border-border bg-card h-10 w-10 min-h-[40px] min-w-[40px] text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                aria-label={isNavOpen ? "Navigation schließen" : "Navigation öffnen"}
                aria-expanded={isNavOpen}
                onClick={() => setIsNavOpen((prev) => !prev)}
              >
                {isNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:inline-flex touch-manipulation min-h-[40px] gap-2"
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
                    <div className="py-2 px-2 space-y-1">
                      {userSettingsLink && (
                        <Link
                          href={userSettingsLink.href}
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center justify-between rounded-md px-3 py-2 min-h-[40px] text-sm border border-transparent text-foreground hover:bg-accent hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <span>{userSettingsLink.label}</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center justify-between rounded-md px-3 py-2 min-h-[40px] text-sm border border-transparent text-foreground hover:bg-accent hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span>Abmelden</span>
                        <LogOut className="w-4 h-4" />
                      </button>
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
            <div
              className="sm:hidden absolute top-full left-0 w-full z-40 bg-card border-b border-border shadow-lg"
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard Navigation"
            >
              <div className="px-4 py-3 space-y-1 max-h-[calc(100dvh-3.75rem)] overflow-y-auto overscroll-contain">
                <DashboardMobileGroupedNav
                  groups={groupedNav}
                  onNavigate={() => setIsNavOpen(false)}
                />
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

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside
          className={`hidden sm:flex flex-col border-r border-border bg-card/70 backdrop-blur-sm transition-[width] duration-200 ${
            isSidebarCollapsed ? "w-[84px]" : "w-[280px]"
          }`}
        >
          <div
            className={`h-12 border-b border-border flex items-center ${
              isSidebarCollapsed ? "justify-center px-0" : "justify-between px-3"
            }`}
          >
            {!isSidebarCollapsed ? (
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Navigation</span>
            ) : (
              <span className="sr-only">Navigation</span>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="inline-flex items-center justify-center h-10 w-10 min-h-[40px] min-w-[40px] rounded-md border border-border bg-card text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              aria-label={isSidebarCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}
              title={isSidebarCollapsed ? "Ausklappen" : "Einklappen"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <DashboardSidebar
              groups={groupedNav}
              itemVariant="sidebar"
              compact={isSidebarCollapsed}
              enableSubmenus={true}
            />
          </div>
        </aside>

        <main className="flex-1 overflow-hidden min-h-0">{children}</main>
      </div>
    </div>
  );
}
