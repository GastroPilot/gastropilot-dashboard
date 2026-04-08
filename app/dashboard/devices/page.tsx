"use client";

import { useEffect, useState, useCallback } from "react";
import {
  devicesApi,
  Device,
  DeviceWithToken,
} from "@/lib/api/devices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import { confirmAction } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Monitor,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  X,
  Save,
  Key,
  Clock,
} from "lucide-react";

const STATION_OPTIONS = [
  { value: "alle", label: "Alle Stationen" },
  { value: "kueche", label: "Küche" },
  { value: "bar", label: "Bar" },
  { value: "grill", label: "Grill" },
  { value: "dessert", label: "Dessert" },
  { value: "vorspeisen", label: "Vorspeisen" },
];

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [shownToken, setShownToken] = useState<string | null>(null);
  const [shownDeviceName, setShownDeviceName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);

  // Form States
  const [name, setName] = useState("");
  const [station, setStation] = useState("alle");

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const devicesData = await devicesApi.list();
      setDevices(devicesData);
    } catch (err) {
      console.error("Error loading devices:", err);
      addToast("Fehler beim Laden der Geräte", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setName("");
    setStation("alle");
    setError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Gerätename ist erforderlich");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const created: DeviceWithToken = await devicesApi.create({
        name: name.trim(),
        station,
      });
      addToast("Gerät erstellt", "success");
      setCreateDialogOpen(false);
      resetForm();

      // Show the token in a separate dialog
      setShownToken(created.device_token);
      setShownDeviceName(created.name);
      setTokenDialogOpen(true);

      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Erstellen");
      addToast(err?.message || "Fehler beim Erstellen", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (device: Device) => {
    const confirmed = confirmAction(
      `Möchten Sie das Gerät "${device.name}" wirklich löschen? Der Zugang wird sofort gesperrt.`
    );
    if (!confirmed) return;

    try {
      await devicesApi.delete(device.id);
      addToast("Gerät gelöscht", "success");
      await loadData();
    } catch (err: any) {
      addToast(err?.message || "Fehler beim Löschen", "error");
    }
  };

  const handleRegenerateToken = async (device: Device) => {
    const confirmed = confirmAction(
      `Token für "${device.name}" neu generieren? Das alte Token wird ungültig.`
    );
    if (!confirmed) return;

    try {
      const result = await devicesApi.regenerateToken(device.id);
      addToast("Token erfolgreich neu generiert", "success");

      setShownToken(result.device_token);
      setShownDeviceName(device.name);
      setTokenDialogOpen(true);

      await loadData();
    } catch (err: any) {
      addToast(err?.message || "Fehler beim Regenerieren", "error");
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    addToast("Token kopiert", "success");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nie";
    try {
      return new Date(dateStr).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getStationLabel = (value: string) => {
    return (
      STATION_OPTIONS.find((s) => s.value === value)?.label || value
    );
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
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

      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Geräte / KDS
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Kitchen Display System - Geräteverwaltung
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                size="sm"
                className="bg-primary text-white dark:text-foreground shadow-none hover:bg-primary hover:text-white dark:hover:text-foreground hover:shadow-none"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Gerät
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Keine Geräte registriert
              </h2>
              <p className="text-muted-foreground mb-4">
                Registrieren Sie Ihr erstes KDS-Gerät, um
                Küchenbestellungen anzuzeigen.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90 text-foreground"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Erstes Gerät registrieren
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="bg-card border border-border rounded-lg p-4 transition-colors hover:border-orange-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {device.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getStationLabel(device.station)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOnline(device.last_seen_at) ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Zuletzt gesehen:
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(device.last_seen_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Erstellt:
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(device.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Status:
                      </span>
                      <span
                        className={
                          isOnline(device.last_seen_at)
                            ? "text-green-500 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {isOnline(device.last_seen_at)
                          ? "Online"
                          : "Offline"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateToken(device)}
                      className="flex-1 border-input text-foreground hover:bg-muted"
                    >
                      <Key className="w-4 h-4 mr-1" />
                      Token erneuern
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(device)}
                      className="border-red-600 text-red-400 hover:bg-red-900/20 hover:border-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Device Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Neues KDS-Gerät registrieren</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Gerätezugang für Ihr Kitchen Display
              System.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Gerätename *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Küche Hauptstation"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Station
              </label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Wählen Sie die Küchen-Station, deren Bestellungen auf
                diesem Gerät angezeigt werden sollen.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-1" />
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              <Save className="w-4 h-4 mr-1" />
              {loading ? "Erstellen..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Display Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Geräte-Token</DialogTitle>
            <DialogDescription>
              Kopieren Sie dieses Token und tragen Sie es in Ihrem KDS-Gerät
              ein. Das Token wird aus Sicherheitsgründen nur einmal angezeigt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="w-4 h-4" />
              <span className="font-medium text-foreground">
                {shownDeviceName}
              </span>
            </div>

            <div className="bg-background border border-border rounded-lg p-4">
              <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                Geräte-Token
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-card px-3 py-2 rounded border border-border break-all">
                  {shownToken}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shownToken && copyToken(shownToken)}
                  title="Token kopieren"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
              <strong>Wichtig:</strong> Dieses Token wird nur einmal
              angezeigt. Speichern Sie es jetzt oder tragen Sie es direkt
              auf dem KDS-Gerät ein.
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setTokenDialogOpen(false);
                setShownToken(null);
                setShownDeviceName("");
              }}
            >
              Schließen
            </Button>
            <Button
              onClick={() => shownToken && copyToken(shownToken)}
            >
              <Copy className="w-4 h-4 mr-1" />
              Token kopieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
