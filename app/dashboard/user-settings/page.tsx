"use client";

import React, { useMemo, useEffect } from "react";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Settings2, Trash2 } from "lucide-react";

const CONFIRM_KEY = "confirmations_enabled";

export default function UserSettingsPage() {
  const { settings, isLoading, error, toasts, deleteSettingKey, addToast, updateSettings } = useUserSettings();

  const entries = useMemo(() => {
    const raw = settings?.settings ?? {};
    return Object.entries(raw);
  }, [settings]);

  const confirmationsEnabled = useMemo(() => {
    const raw = settings?.settings?.[CONFIRM_KEY];
    if (raw === undefined) return true;
    return Boolean(raw);
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    const confirmVal = settings.settings?.[CONFIRM_KEY];
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONFIRM_KEY, (confirmVal === undefined ? true : Boolean(confirmVal)).toString());
    }
  }, [settings]);

  if (isLoading && !settings) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                toast.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-slate-800/90 border-slate-600 text-slate-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-[#F95100]/25">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Benutzereinstellungen</h1>
              <p className="text-sm text-muted-foreground">Persönliche Einstellungen für Darstellung und Sicherheit.</p>
              {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
          <div className="rounded-lg border border-card bg-card/60 shadow-lg shadow-black/20 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-card bg-background/70 rounded-t-lg">
              <h2 className="text-sm font-semibold text-foreground">Darstellung & Bestätigung</h2>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Schalter</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-foreground">
                  <div className="font-semibold">Bestätigungsfenster</div>
                  <div className="text-xs text-muted-foreground">Schaltet Sicherheitsabfragen (Löschen/Abschließen) ein oder aus.</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={confirmationsEnabled}
                  onClick={async () => {
                    try {
                      await updateSettings({ [CONFIRM_KEY]: !confirmationsEnabled });
                      window.localStorage.setItem(CONFIRM_KEY, (!confirmationsEnabled).toString());
                      addToast(`Bestätigungsfenster ${!confirmationsEnabled ? "aktiviert" : "deaktiviert"}.`, "success");
                    } catch (err) {
                      // Fehler wird bereits getoastet
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-background ${
                    confirmationsEnabled
                      ? "bg-primary/80 shadow-[0_10px_24px_rgba(249,81,0,0.35)] hover:shadow-[0_12px_28px_rgba(249,81,0,0.35)] hover:-translate-y-[1px]"
                      : "bg-muted hover:bg-accent hover:-translate-y-[1px]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all ${
                      confirmationsEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 p-5 text-center text-muted-foreground text-sm">
              Keine Einstellungen gespeichert.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-card bg-card/60 shadow-lg shadow-black/20">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-foreground">
                  <thead className="bg-accent text-muted-foreground uppercase tracking-wide text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Key</th>
                      <th className="px-4 py-3 text-left w-2/3">Wert</th>
                      <th className="px-4 py-3 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {entries.map(([key, value]) => (
                      <tr key={key} className="hover:bg-accent/40">
                        <td className="px-4 py-3 align-top break-all font-semibold text-sm">{key}</td>
                        <td className="px-4 py-3 align-top">
                          <pre className="bg-background/70 border border-card rounded-md p-3 text-foreground whitespace-pre-wrap break-words text-xs leading-relaxed">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 px-3 gap-2 shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)]"
                            onClick={async () => {
                              try {
                                await deleteSettingKey(key);
                                addToast("Einstellung gelöscht.", "success");
                              } catch (err) {
                                // Fehlermeldung wird bereits im Hook getoastet
                              }
                            }}
                            title="Einstellung löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Löschen</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
