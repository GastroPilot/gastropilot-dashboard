"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAdminAuth } from "@/lib/hooks/use-admin-auth";
import { useState } from "react";
import {
  Menu,
  X,
  User,
  LogOut,
  Shield,
  Heart,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isAdmin, adminUser, logout: adminLogout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isLoggedIn = isAuthenticated || isAdmin;
  const displayName = isAuthenticated
    ? user?.first_name
    : adminUser?.first_name;

  const handleLogout = () => {
    if (isAuthenticated) logout();
    if (isAdmin) adminLogout();
    setProfileOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
          <Logo size="sm" />
          <span className="hidden sm:inline">GastroPilot</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          <Link href="/restaurants" className="rounded-full px-4 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Restaurants
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/reservations" className="rounded-full px-4 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                Reservierungen
              </Link>
              <Link href="/favorites" className="rounded-full px-4 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                Merkliste
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="rounded-full px-4 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Right */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/fuer-restaurants"
            className="rounded-full px-4 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Für Restaurants
          </Link>

          <span className="h-5 w-px bg-border" />

          <LanguageSwitcher />
          <ThemeToggle />
          {isAuthenticated && <NotificationBell />}

          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-[14px] font-medium transition-colors hover:bg-accent"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                  {isAdmin && !isAuthenticated ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="max-w-[100px] truncate">{displayName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-border/60 bg-card p-1.5 shadow-xl shadow-black/[0.06]">
                  {isAuthenticated && (
                    <>
                      <Link href="/profile" className="block rounded-[10px] px-3 py-2 text-[14px] font-medium hover:bg-accent" onClick={() => setProfileOpen(false)}>Profil</Link>
                      <Link href="/reservations" className="block rounded-[10px] px-3 py-2 text-[14px] font-medium hover:bg-accent" onClick={() => setProfileOpen(false)}>Reservierungen</Link>
                      <Link href="/favorites" className="block rounded-[10px] px-3 py-2 text-[14px] font-medium hover:bg-accent" onClick={() => setProfileOpen(false)}>Merkliste</Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link href="/admin" className="block rounded-[10px] px-3 py-2 text-[14px] font-medium hover:bg-accent" onClick={() => setProfileOpen(false)}>Admin</Link>
                  )}
                  <div className="my-1 h-px bg-border" />
                  <a
                    href="https://app.gastropilot.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-[10px] px-3 py-2 text-[14px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Restaurant-Dashboard
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="rounded-full px-4 py-2 text-[14px] font-semibold text-foreground transition-colors hover:bg-accent">
                Anmelden
              </Link>
              <Link href="/auth/register" className="rounded-full bg-foreground px-5 py-2 text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90">
                Registrieren
              </Link>
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <button className="rounded-[10px] p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menü">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t md:hidden">
          <nav className="flex flex-col px-4 py-3">
            <Link href="/restaurants" className="rounded-[10px] px-3 py-2.5 text-[15px] font-medium" onClick={() => setMobileOpen(false)}>Restaurants</Link>
            <Link href="/fuer-restaurants" className="rounded-[10px] px-3 py-2.5 text-[15px] font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Für Restaurants</Link>
            <div className="my-2 h-px bg-border" />

            {isLoggedIn ? (
              <>
                {isAuthenticated && (
                  <>
                    <Link href="/reservations" className="rounded-[10px] px-3 py-2.5 text-[15px] font-medium" onClick={() => setMobileOpen(false)}>Reservierungen</Link>
                    <Link href="/favorites" className="rounded-[10px] px-3 py-2.5 text-[15px] font-medium" onClick={() => setMobileOpen(false)}>Merkliste</Link>
                    <Link href="/profile" className="rounded-[10px] px-3 py-2.5 text-[15px] font-medium" onClick={() => setMobileOpen(false)}>Profil</Link>
                  </>
                )}
                {isAdmin && <Link href="/admin" className="rounded-[10px] px-3 py-2.5 text-[15px] font-medium" onClick={() => setMobileOpen(false)}>Admin</Link>}
                <div className="my-2 h-px bg-border" />
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                <button onClick={handleLogout} className="rounded-[10px] px-3 py-2.5 text-left text-[15px] text-muted-foreground">Abmelden</button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                <div className="flex gap-2 px-3 pb-1 pt-2">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-full border py-2.5 text-center text-[15px] font-semibold">Anmelden</Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-full bg-foreground py-2.5 text-center text-[15px] font-semibold text-background">Registrieren</Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
