"use client";

import React, { useMemo, useEffect } from "react";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Settings2, Trash2 } from "lucide-react";

const SNOW_KEY = "snow_enabled";
const CONFIRM_KEY = "confirmations_enabled";

export default function UserSettingsPage() {
  const { settings, isLoading, error, toasts, deleteSettingKey, addToast, updateSettings } = useUserSettings();

  const entries = useMemo(() => {
    const raw = settings?.settings ?? {};
    return Object.entries(raw);
  }, [settings]);

  const snowEnabled = useMemo(() => {
    const raw = settings?.settings?.[SNOW_KEY];
    if (raw === undefined) return true;
    return Boolean(raw);
  }, [settings]);

  const confirmationsEnabled = useMemo(() => {
    const raw = settings?.settings?.[CONFIRM_KEY];
    if (raw === undefined) return true;
    return Boolean(raw);
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    const snow = settings.settings?.[SNOW_KEY];
    const confirmVal = settings.settings?.[CONFIRM_KEY];
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SNOW_KEY, (snow === undefined ? true : Boolean(snow)).toString());
      window.localStorage.setItem(CONFIRM_KEY, (confirmVal === undefined ? true : Boolean(confirmVal)).toString());
    }
  }, [settings]);

  if (isLoading && !settings) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
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

      <div className="bg-gray-800 border-b border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Benutzereinstellungen</h1>
              <p className="text-sm text-gray-400">Persönliche Einstellungen für Darstellung und Sicherheit.</p>
              {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
          <div className="rounded-lg border border-gray-800 bg-gray-850/60 shadow-lg shadow-black/20 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/70 rounded-t-lg">
              <h2 className="text-sm font-semibold text-white">Darstellung & Bestätigung</h2>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">Schalter</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-200">
                  <div className="font-semibold">Schnee-Effekt</div>
                  <div className="text-xs text-gray-400">Schaltet die animierten Schneeflocken ein oder aus.</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={snowEnabled}
                  onClick={async () => {
                    try {
                      await updateSettings({ [SNOW_KEY]: !snowEnabled });
                      window.localStorage.setItem(SNOW_KEY, (!snowEnabled).toString());
                      addToast(`Schnee-Effekt ${!snowEnabled ? "aktiviert" : "deaktiviert"}.`, "success");
                    } catch (err) {
                      // Fehler wird bereits getoastet
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    snowEnabled
                      ? "bg-blue-500/80 shadow-[0_10px_24px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_28px_rgba(59,130,246,0.35)] hover:-translate-y-[1px]"
                      : "bg-gray-600 hover:bg-gray-500 hover:-translate-y-[1px]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all ${
                      snowEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-200">
                  <div className="font-semibold">Bestätigungsfenster</div>
                  <div className="text-xs text-gray-400">Schaltet Sicherheitsabfragen (Löschen/Abschließen) ein oder aus.</div>
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    confirmationsEnabled
                      ? "bg-blue-500/80 shadow-[0_10px_24px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_28px_rgba(59,130,246,0.35)] hover:-translate-y-[1px]"
                      : "bg-gray-600 hover:bg-gray-500 hover:-translate-y-[1px]"
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
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/60 p-5 text-center text-gray-300 text-sm">
              Keine Einstellungen gespeichert.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-850/60 shadow-lg shadow-black/20">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-100">
                  <thead className="bg-gray-800/80 text-gray-300 uppercase tracking-wide text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Key</th>
                      <th className="px-4 py-3 text-left w-2/3">Wert</th>
                      <th className="px-4 py-3 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {entries.map(([key, value]) => (
                      <tr key={key} className="hover:bg-gray-800/40">
                        <td className="px-4 py-3 align-top break-all font-semibold text-sm">{key}</td>
                        <td className="px-4 py-3 align-top">
                          <pre className="bg-gray-900/70 border border-gray-800 rounded-md p-3 text-gray-100 whitespace-pre-wrap break-words text-xs leading-relaxed">
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
