"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, CheckCircle2, LogIn, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import { adminApi, Tenant, impersonation } from "@/lib/api/admin";

export default function RestaurantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const isImpersonating = impersonation.isActive();
  const activeTenantId = impersonation.getTenantId();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listTenants();
      setTenants(data);
    } catch {
      setError("Tenants konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleImpersonate = async (tenant: Tenant) => {
    setImpersonating(tenant.id);
    try {
      const res = await adminApi.impersonateTenant(tenant.id);
      impersonation.start(res.impersonation_token, res.tenant_id, res.tenant_name);
      window.location.href = "/dashboard";
    } catch {
      setError(`Impersonation für „${tenant.name}" fehlgeschlagen.`);
      setImpersonating(null);
    }
  };

  const handleReturnToBase = () => {
    impersonation.stop();
    window.location.href = "/dashboard/restaurants";
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.slug ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingOverlay />;

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
                <p className="text-sm text-muted-foreground">
                  Alle Restaurants auf der Plattform – klicke auf „Impersonieren" um in den Kontext zu wechseln.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="gap-2 self-start sm:self-auto">
              <RefreshCw className="w-4 h-4" />
              Aktualisieren
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 pb-20">
          {error && (
            <div className="rounded-lg border border-red-600/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Grundstatus-Karte */}
          <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 transition-colors ${
            !isImpersonating
              ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
              : "border-border bg-card/60"
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                !isImpersonating
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Grundstatus</span>
                  {!isImpersonating && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktiv
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Plattform-Admin – kein Tenant-Kontext
                </p>
              </div>
            </div>
            {isImpersonating && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReturnToBase}
                className="shrink-0 gap-2 hover:border-primary hover:text-primary"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Wechseln
              </Button>
            )}
          </div>

          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder Slug suchen…"
              className="pl-9"
            />
          </div>

          {/* Tabelle */}
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground text-sm">
              {search ? "Keine Treffer." : "Noch keine Tenants vorhanden."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card/60 shadow-lg shadow-black/20">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-foreground">
                  <thead className="bg-accent text-muted-foreground uppercase tracking-wide text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Slug</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">ID</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">Angelegt</th>
                      <th className="px-4 py-3 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {filtered.map((tenant) => {
                      const isActive = activeTenantId === tenant.id;
                      return (
                        <tr
                          key={tenant.id}
                          className={`transition-colors ${isActive ? "bg-primary/5" : "hover:bg-accent/40"}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{tenant.name}</span>
                              {isActive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Aktiv
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {tenant.slug ? (
                              <code className="bg-background/70 border border-border px-1.5 py-0.5 rounded text-xs">
                                {tenant.slug}
                              </code>
                            ) : (
                              <span className="text-muted-foreground/50 italic text-xs">–</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <code className="text-xs text-muted-foreground/70">{tenant.id.slice(0, 8)}…</code>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                            {new Date(tenant.created_at).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isActive ? (
                              <Button size="sm" variant="outline" disabled className="gap-2 opacity-50 cursor-default">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aktiv
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleImpersonate(tenant)}
                                disabled={impersonating === tenant.id}
                                className="gap-2 hover:border-primary hover:text-primary"
                              >
                                {impersonating === tenant.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <LogIn className="w-3.5 h-3.5" />
                                )}
                                Impersonieren
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-right">
            {filtered.length} von {tenants.length} Tenants
          </p>
        </div>
      </div>
    </div>
  );
}
