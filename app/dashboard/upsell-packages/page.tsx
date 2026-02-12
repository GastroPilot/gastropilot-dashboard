"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import {
  upsellPackagesApi,
  UpsellPackage,
  UpsellPackageCreate,
  UpsellPackageUpdate,
} from "@/lib/api/upsell-packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  X,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Calendar,
} from "lucide-react";
import { confirmAction } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WEEKDAYS = [
  { value: 0, label: "Montag" },
  { value: 1, label: "Dienstag" },
  { value: 2, label: "Mittwoch" },
  { value: 3, label: "Donnerstag" },
  { value: 4, label: "Freitag" },
  { value: 5, label: "Samstag" },
  { value: 6, label: "Sonntag" },
];

export default function UpsellPackagesPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [packages, setPackages] = useState<UpsellPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<UpsellPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);

  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [availableFromDate, setAvailableFromDate] = useState("");
  const [availableUntilDate, setAvailableUntilDate] = useState("");
  const [minPartySize, setMinPartySize] = useState<number | null>(null);
  const [maxPartySize, setMaxPartySize] = useState<number | null>(null);
  const [availableTimes, setAvailableTimes] = useState<Record<string, string[]>>({});
  const [availableWeekdays, setAvailableWeekdays] = useState<number[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [newTimes, setNewTimes] = useState<Record<number, string>>({});

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
      const restaurantsData = await restaurantsApi.list();

      if (restaurantsData.length === 0) {
        addToast("Kein Restaurant gefunden", "error");
        return;
      }

      const selectedRestaurant = restaurantsData[0];
      setRestaurant(selectedRestaurant);

      const packagesData = await upsellPackagesApi.list(selectedRestaurant.id, true);
      setPackages(packagesData);
    } catch (err) {
      console.error("Error loading upsell packages:", err);
      addToast("Fehler beim Laden der Upsell-Pakete", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice(0);
    setIsActive(true);
    setAvailableFromDate("");
    setAvailableUntilDate("");
    setMinPartySize(null);
    setMaxPartySize(null);
    setAvailableTimes({});
    setAvailableWeekdays([]);
    setImageUrl("");
    setDisplayOrder(0);
    setNewTimes({});
    setEditingPackage(null);
    setError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (pkg: UpsellPackage) => {
    setName(pkg.name);
    setDescription(pkg.description || "");
    setPrice(pkg.price);
    setIsActive(pkg.is_active);
    setAvailableFromDate(pkg.available_from_date ? pkg.available_from_date.split("T")[0] : "");
    setAvailableUntilDate(pkg.available_until_date ? pkg.available_until_date.split("T")[0] : "");
    setMinPartySize(pkg.min_party_size);
    setMaxPartySize(pkg.max_party_size);
    setAvailableTimes(pkg.available_times || {});
    setAvailableWeekdays(pkg.available_weekdays || []);
    setImageUrl(pkg.image_url || "");
    setDisplayOrder(pkg.display_order);
    setEditingPackage(pkg);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;

    if (!name.trim()) {
      setError("Name ist erforderlich");
      return;
    }

    if (price <= 0) {
      setError("Preis muss größer als 0 sein");
      return;
    }

    if (minPartySize !== null && maxPartySize !== null && minPartySize > maxPartySize) {
      setError("Mindest-Gruppengröße darf nicht größer als Maximal-Gruppengröße sein");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const timesData = Object.keys(availableTimes).length > 0 ? availableTimes : null;
      const weekdaysData = availableWeekdays.length > 0 ? availableWeekdays : null;

      if (editingPackage) {
        const updateData: UpsellPackageUpdate = {
          name,
          description: description || null,
          price,
          is_active: isActive,
          available_from_date: availableFromDate || null,
          available_until_date: availableUntilDate || null,
          min_party_size: minPartySize || null,
          max_party_size: maxPartySize || null,
          available_times: timesData,
          available_weekdays: weekdaysData,
          image_url: imageUrl || null,
          display_order: displayOrder,
        };
        await upsellPackagesApi.update(restaurant.id, editingPackage.id, updateData);
        addToast("Upsell-Paket aktualisiert", "success");
      } else {
        const createData: UpsellPackageCreate = {
          restaurant_id: restaurant.id,
          name,
          description: description || null,
          price,
          is_active: isActive,
          available_from_date: availableFromDate || null,
          available_until_date: availableUntilDate || null,
          min_party_size: minPartySize || null,
          max_party_size: maxPartySize || null,
          available_times: timesData,
          available_weekdays: weekdaysData,
          image_url: imageUrl || null,
          display_order: displayOrder,
        };
        await upsellPackagesApi.create(restaurant.id, createData);
        addToast("Upsell-Paket erstellt", "success");
      }

      setDialogOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern");
      addToast(err?.message || "Fehler beim Speichern", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pkg: UpsellPackage) => {
    if (!restaurant) return;

    const confirmed = confirmAction(
      `Möchten Sie das Upsell-Paket "${pkg.name}" wirklich löschen?`
    );

    if (!confirmed) return;

    try {
      await upsellPackagesApi.delete(restaurant.id, pkg.id);
      addToast("Upsell-Paket gelöscht", "success");
      await loadData();
    } catch (err: any) {
      addToast(err?.message || "Fehler beim Löschen", "error");
    }
  };

  const toggleWeekday = (weekday: number) => {
    setAvailableWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((w) => w !== weekday) : [...prev, weekday]
    );
  };

  const addTimeForWeekday = (weekday: number, time: string) => {
    if (!time.trim()) return;
    const weekdayKey = WEEKDAYS.find((w) => w.value === weekday)?.label.toLowerCase() || "";
    setAvailableTimes((prev) => {
      const current = prev[weekdayKey] || [];
      if (!current.includes(time)) {
        return { ...prev, [weekdayKey]: [...current, time].sort() };
      }
      return prev;
    });
    setNewTimes((prev) => ({ ...prev, [weekday]: "" }));
  };

  const removeTimeForWeekday = (weekday: number, time: string) => {
    const weekdayKey = WEEKDAYS.find((w) => w.value === weekday)?.label.toLowerCase() || "";
    setAvailableTimes((prev) => {
      const current = prev[weekdayKey] || [];
      return { ...prev, [weekdayKey]: current.filter((t) => t !== time) };
    });
  };

  const formatWeekdays = (weekdays: number[]) => {
    if (weekdays.length === 0) return "Keine Einschränkung";
    if (weekdays.length === 7) return "Alle Tage";
    return weekdays
      .sort()
      .map((w) => WEEKDAYS.find((d) => d.value === w)?.label)
      .join(", ");
  };

  const formatTimes = (times: Record<string, string[]>) => {
    if (Object.keys(times).length === 0) return "Keine Einschränkung";
    const entries = Object.entries(times)
      .map(([day, times]) => `${day}: ${times.join(", ")}`)
      .join("; ");
    return entries || "Keine Einschränkung";
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!restaurant) {
    return (
      <div className="h-full flex flex-col bg-background text-foreground items-center justify-center">
        <p className="text-muted-foreground">Kein Restaurant gefunden</p>
      </div>
    );
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
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Package className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Upsell-Paket-Verwaltung</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {restaurant.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                size="sm"
                className="bg-primary text-foreground shadow-none hover:bg-primary hover:shadow-[0_12px_32px_rgba(37,99,235,0.35)]"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Paket
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {packages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Noch keine Upsell-Pakete vorhanden</h2>
              <p className="text-muted-foreground mb-4">Erstellen Sie Ihr erstes Upsell-Paket</p>
              <Button
                className="bg-primary hover:bg-primary/90 text-foreground"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Erstes Paket erstellen
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages
                .sort((a, b) => a.display_order - b.display_order)
                .map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`bg-card border rounded-lg p-4 transition-colors ${
                      pkg.is_active
                        ? "border-border hover:border-purple-500"
                        : "border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pkg.is_active ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {pkg.image_url && (
                      <Image
                        src={pkg.image_url}
                        alt={pkg.name}
                        width={400}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                        unoptimized
                      />
                    )}

                    <div className="space-y-1 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preis:</span>
                        <span className="font-bold text-purple-400">{pkg.price.toFixed(2)} €</span>
                      </div>
                      {(pkg.min_party_size || pkg.max_party_size) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gruppengröße:</span>
                          <span className="text-muted-foreground">
                            {pkg.min_party_size && pkg.max_party_size
                              ? `${pkg.min_party_size}-${pkg.max_party_size} Personen`
                              : pkg.min_party_size
                              ? `ab ${pkg.min_party_size} Personen`
                              : `bis ${pkg.max_party_size} Personen`}
                          </span>
                        </div>
                      )}
                      {(pkg.available_from_date || pkg.available_until_date) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verfügbar:</span>
                          <span className="text-xs text-muted-foreground">
                            {pkg.available_from_date &&
                              new Date(pkg.available_from_date).toLocaleDateString("de-DE")}
                            {pkg.available_from_date && pkg.available_until_date && " - "}
                            {pkg.available_until_date &&
                              new Date(pkg.available_until_date).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      )}
                      {pkg.available_weekdays && pkg.available_weekdays.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Wochentage:</span>
                          <span className="text-xs text-muted-foreground">{formatWeekdays(pkg.available_weekdays)}</span>
                        </div>
                      )}
                      {pkg.available_times && Object.keys(pkg.available_times).length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zeiten:</span>
                          <span className="text-xs text-muted-foreground">{formatTimes(pkg.available_times)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reihenfolge:</span>
                        <span className="text-muted-foreground">{pkg.display_order}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(pkg)}
                        className="flex-1 border-input text-foreground hover:bg-muted"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pkg)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Upsell-Paket bearbeiten" : "Neues Upsell-Paket"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Bearbeiten Sie die Paket-Details"
                : "Erstellen Sie ein neues Upsell-Paket für Ihr Restaurant"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 md:px-6 pb-4">
            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Premium-Menü"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Preis (€) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung des Pakets..."
                className="w-full px-3 py-2 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Verfügbar ab (optional)
                </label>
                <Input
                  type="date"
                  value={availableFromDate}
                  onChange={(e) => setAvailableFromDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Verfügbar bis (optional)
                </label>
                <Input
                  type="date"
                  value={availableUntilDate}
                  onChange={(e) => setAvailableUntilDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Mindest-Gruppengröße (optional)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={minPartySize || ""}
                  onChange={(e) =>
                    setMinPartySize(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Kein Minimum"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Maximal-Gruppengröße (optional)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={maxPartySize || ""}
                  onChange={(e) =>
                    setMaxPartySize(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Kein Maximum"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Verfügbare Wochentage (optional)
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                      availableWeekdays.includes(day.value)
                        ? "bg-primary text-foreground border-primary"
                        : "bg-card text-muted-foreground border-input hover:border-blue-400"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leer lassen für alle Tage. Klicken Sie auf Wochentage, um sie auszuwählen.
              </p>
            </div>

            {availableWeekdays.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Verfügbare Zeiten pro Wochentag (optional)
                </label>
                <div className="space-y-3 mt-2">
                  {availableWeekdays.map((weekday) => {
                    const weekdayKey =
                      WEEKDAYS.find((w) => w.value === weekday)?.label.toLowerCase() || "";
                    const times = availableTimes[weekdayKey] || [];
                    const newTime = newTimes[weekday] || "";

                    return (
                      <div key={weekday} className="border border-input rounded-lg p-3 bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">
                            {WEEKDAYS.find((w) => w.value === weekday)?.label}
                          </span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <Input
                            type="time"
                            value={newTime}
                            onChange={(e) =>
                              setNewTimes((prev) => ({ ...prev, [weekday]: e.target.value }))
                            }
                            className="flex-1"
                            placeholder="HH:MM"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newTime) {
                                addTimeForWeekday(weekday, newTime);
                              }
                            }}
                          >
                            Hinzufügen
                          </Button>
                        </div>
                        {times.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {times.map((time) => (
                              <span
                                key={time}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-sm border border-purple-700"
                              >
                                {time}
                                <button
                                  type="button"
                                  onClick={() => removeTimeForWeekday(weekday, time)}
                                  className="text-purple-300 hover:text-purple-100 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Bild-URL (optional)
                </label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Anzeigereihenfolge
                </label>
                <Input
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Niedrigere Zahlen werden zuerst angezeigt
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="isActive" className="text-sm font-medium text-muted-foreground">
                Paket ist aktiv
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
              className="gap-2"
            >
              <X className="w-4 h-4 mr-1" />
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="gap-2"
            >
              <Save className="w-4 h-4 mr-1" />
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
