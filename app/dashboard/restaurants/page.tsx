"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { restaurantsApi, Restaurant, RestaurantCreate } from "@/lib/api/restaurants";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/loading-overlay";
import {  Building2, Edit, Save, X, MapPin, Phone, Mail, FileText, CheckCircle2, AlertCircle, Loader2, Globe, Clock, Euro, Settings, Calendar, Info, Link, Users, ExternalLink, Copy, Nfc, CreditCard } from "lucide-react";

export default function RestaurantManagePage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<RestaurantCreate & {
    website?: string | null;
    openingHours?: string | null;
    currency?: string | null;
    timezone?: string | null;
    minReservationDuration?: number | null;
    cancellationPolicy?: string | null;
    sumup_enabled?: boolean;
    sumup_default_reader_id?: string | null;
  }>({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    website: "",
    openingHours: "",
    currency: "EUR",
    timezone: "Europe/Berlin",
    minReservationDuration: 60,
    cancellationPolicy: "",
    slug: "",
    public_booking_enabled: false,
    booking_lead_time_hours: 2,
    booking_max_party_size: 12,
    booking_default_duration: 120,
    sumup_enabled: false,
    sumup_default_reader_id: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);

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

  const loadRestaurant = useCallback(async () => {
    try {
      setLoading(true);
      const restaurants = await restaurantsApi.list();
      if (restaurants.length > 0) {
        const firstRestaurant = restaurants[0];
        setRestaurant(firstRestaurant);
        // Parse extended data from description if available (temporary solution)
        let extendedData: any = {};
        try {
          if (firstRestaurant.description?.includes('__EXTENDED_DATA__')) {
            const parts = firstRestaurant.description.split('__EXTENDED_DATA__');
            if (parts.length > 1) {
              extendedData = JSON.parse(parts[1]);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }

        setFormData({
          name: firstRestaurant.name,
          address: firstRestaurant.address || "",
          phone: firstRestaurant.phone || "",
          email: firstRestaurant.email || "",
          description: firstRestaurant.description?.split('__EXTENDED_DATA__')[0] || "",
          website: extendedData.website || "",
          openingHours: extendedData.openingHours || "",
          currency: extendedData.currency || "EUR",
          timezone: extendedData.timezone || "Europe/Berlin",
          minReservationDuration: extendedData.minReservationDuration || 60,
          cancellationPolicy: extendedData.cancellationPolicy || "",
          slug: firstRestaurant.slug || "",
          public_booking_enabled: firstRestaurant.public_booking_enabled ?? false,
          booking_lead_time_hours: firstRestaurant.booking_lead_time_hours ?? 2,
          booking_max_party_size: firstRestaurant.booking_max_party_size ?? 12,
          booking_default_duration: firstRestaurant.booking_default_duration ?? 120,
          sumup_enabled: firstRestaurant.sumup_enabled ?? false,
          sumup_default_reader_id: firstRestaurant.sumup_default_reader_id || "",
        });
      }
    } catch (err) {
      console.error("Fehler beim Laden des Restaurants:", err);
      addToast("Fehler beim Laden des Restaurants", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Restaurantname ist erforderlich");
      return false;
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError("Bitte geben Sie eine gültige E-Mail-Adresse ein");
        return false;
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        setError("Bitte geben Sie eine gültige Telefonnummer ein");
        return false;
      }
    }

    if (formData.website && formData.website.trim()) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const cleanUrl = formData.website.trim().replace(/^https?:\/\//, '');
      if (!urlPattern.test(`https://${cleanUrl}`)) {
        setError("Bitte geben Sie eine gültige Website-URL ein");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Store extended data in description (temporary solution until backend is extended)
      const extendedData = {
        website: formData.website?.trim() || null,
        openingHours: formData.openingHours?.trim() || null,
        currency: formData.currency || "EUR",
        timezone: formData.timezone || "Europe/Berlin",
        minReservationDuration: formData.minReservationDuration || 60,
        cancellationPolicy: formData.cancellationPolicy?.trim() || null,
      };

      // Always save extended data if form was submitted (even with default values)
      const descriptionText = formData.description?.trim() || "";
      const fullDescription = `${descriptionText}__EXTENDED_DATA__${JSON.stringify(extendedData)}`;

      if (restaurant) {
        // Update existing restaurant
        await restaurantsApi.update(restaurant.id, {
          name: formData.name.trim(),
          address: formData.address?.trim() || null,
          phone: formData.phone?.trim() || null,
          email: formData.email?.trim() || null,
          description: fullDescription || null,
          slug: formData.slug?.trim() || null,
          public_booking_enabled: formData.public_booking_enabled ?? false,
          booking_lead_time_hours: formData.booking_lead_time_hours ?? 2,
          booking_max_party_size: formData.booking_max_party_size ?? 12,
          booking_default_duration: formData.booking_default_duration ?? 120,
          sumup_enabled: formData.sumup_enabled ?? false,
          sumup_default_reader_id: formData.sumup_default_reader_id?.trim() || null,
        });
        addToast("Restaurant erfolgreich aktualisiert", "success");
      } else {
        // Create new restaurant
        const dataToSend: RestaurantCreate = {
          name: formData.name.trim(),
          address: formData.address?.trim() || null,
          phone: formData.phone?.trim() || null,
          email: formData.email?.trim() || null,
          description: fullDescription || null,
          slug: formData.slug?.trim() || null,
          public_booking_enabled: formData.public_booking_enabled ?? false,
          booking_lead_time_hours: formData.booking_lead_time_hours ?? 2,
          booking_max_party_size: formData.booking_max_party_size ?? 12,
          booking_default_duration: formData.booking_default_duration ?? 120,
        };
        await restaurantsApi.create(dataToSend);
        addToast("Restaurant erfolgreich angelegt", "success");
      }
      setIsEditing(false);
      await loadRestaurant();
    } catch (err) {
      console.error("Fehler beim Speichern des Restaurants:", err);
      if (err instanceof ApiError) {
        const errorMessage = err.message || "Fehler beim Speichern des Restaurants";
        setError(errorMessage);
        addToast(errorMessage, "error");
      } else {
        const errorMessage = "Ein unerwarteter Fehler ist aufgetreten";
        setError(errorMessage);
        addToast(errorMessage, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (restaurant) {
      // Parse extended data from description if available
      let extendedData: any = {};
      try {
        if (restaurant.description?.includes('__EXTENDED_DATA__')) {
          const parts = restaurant.description.split('__EXTENDED_DATA__');
          if (parts.length > 1) {
            extendedData = JSON.parse(parts[1]);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }

      setFormData({
        name: restaurant.name,
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        description: restaurant.description?.split('__EXTENDED_DATA__')[0] || "",
        website: extendedData.website || "",
        openingHours: extendedData.openingHours || "",
        currency: extendedData.currency || "EUR",
        timezone: extendedData.timezone || "Europe/Berlin",
        minReservationDuration: extendedData.minReservationDuration || 60,
        cancellationPolicy: extendedData.cancellationPolicy || "",
        slug: restaurant.slug || "",
        public_booking_enabled: restaurant.public_booking_enabled ?? false,
        booking_lead_time_hours: restaurant.booking_lead_time_hours ?? 2,
        booking_max_party_size: restaurant.booking_max_party_size ?? 12,
        booking_default_duration: restaurant.booking_default_duration ?? 120,
      });
    } else {
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        description: "",
        website: "",
        openingHours: "",
        currency: "EUR",
        timezone: "Europe/Berlin",
        minReservationDuration: 60,
        cancellationPolicy: "",
        slug: "",
        public_booking_enabled: false,
        booking_lead_time_hours: 2,
        booking_max_party_size: 12,
        booking_default_duration: 120,
      });
    }
    setIsEditing(false);
    setError("");
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
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
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <Building2 className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Restaurant verwalten
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {restaurant ? "Verwalten Sie Ihre Restaurantinformationen" : "Erstellen Sie ein neues Restaurant"}
                </p>
              </div>
            </div>
        {restaurant && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="gap-2 touch-manipulation min-h-[36px] md:min-h-[40px]"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Bearbeiten</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="w-5 h-5 text-primary" />
                {restaurant 
                  ? (isEditing ? "Restaurant bearbeiten" : "Restaurant-Informationen")
                  : "Neues Restaurant anlegen"}
          </CardTitle>
        </CardHeader>
            <CardContent className="pt-6">
              {!isEditing && restaurant ? (() => {
                // Parse extended data from description if available
                const extendedData: any = {};
                let descriptionText = restaurant.description || "";
                try {
                  if (restaurant.description?.includes('__EXTENDED_DATA__')) {
                    const parts = restaurant.description.split('__EXTENDED_DATA__');
                    descriptionText = parts[0] || "";
                    if (parts.length > 1) {
                      Object.assign(extendedData, JSON.parse(parts[1]));
                    }
                  }
                } catch (e) {
                  // Ignore parse errors
                }

                const hasExtendedData = extendedData && Object.keys(extendedData).length > 0 && 
                  Object.values(extendedData).some((v: any) => v !== null && v !== "");

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                  Restaurantname
                </label>
                <p className="text-lg font-semibold text-foreground">{restaurant.name}</p>
              </div>

              {restaurant.address && (
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                    Adresse
                  </label>
                  <p className="text-muted-foreground">{restaurant.address}</p>
                </div>
              )}

              {restaurant.phone && (
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Phone className="w-4 h-4" />
                    Telefonnummer
                  </label>
                          <p className="text-muted-foreground">
                            <a 
                              href={`tel:${restaurant.phone}`}
                              className="hover:text-primary transition-colors"
                            >
                              {restaurant.phone}
                            </a>
                          </p>
                </div>
              )}

              {restaurant.email && (
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Mail className="w-4 h-4" />
                    E-Mail
                  </label>
                          <p className="text-muted-foreground">
                            <a 
                              href={`mailto:${restaurant.email}`}
                              className="hover:text-primary transition-colors"
                            >
                              {restaurant.email}
                            </a>
                          </p>
                        </div>
                      )}

                      {extendedData.website && (
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Globe className="w-4 h-4" />
                            Website
                          </label>
                          <p className="text-muted-foreground">
                            <a 
                              href={extendedData.website.startsWith('http') ? extendedData.website : `https://${extendedData.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors"
                            >
                              {extendedData.website}
                            </a>
                          </p>
                </div>
              )}
                    </div>

                    {descriptionText && (
                      <div className="space-y-1.5 pt-2 border-t border-border">
                        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <FileText className="w-4 h-4" />
                    Beschreibung
                  </label>
                        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                          {descriptionText}
                        </p>
                      </div>
                    )}

                    {hasExtendedData && (
                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <Settings className="w-5 h-5 text-primary" />
                          Erweiterte Einstellungen
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {extendedData.openingHours && (
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                Öffnungszeiten
                              </label>
                              <p className="text-muted-foreground whitespace-pre-wrap">{extendedData.openingHours}</p>
                            </div>
                          )}

                          {extendedData.currency && (
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Euro className="w-4 h-4" />
                                Währung
                              </label>
                              <p className="text-muted-foreground">{extendedData.currency}</p>
                            </div>
                          )}

                          {extendedData.timezone && (
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                Zeitzone
                              </label>
                              <p className="text-muted-foreground">{extendedData.timezone}</p>
                            </div>
                          )}

                          {extendedData.minReservationDuration && (
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                Mindestaufenthaltsdauer
                              </label>
                              <p className="text-muted-foreground">{extendedData.minReservationDuration} Minuten</p>
                            </div>
                          )}
                        </div>

                        {extendedData.cancellationPolicy && (
                          <div className="space-y-1.5 pt-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Info className="w-4 h-4" />
                              Stornierungsrichtlinie
                            </label>
                            <p className="text-muted-foreground whitespace-pre-wrap">{extendedData.cancellationPolicy}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Online-Reservierungen Anzeige */}
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Globe className="w-5 h-5 text-emerald-400" />
                        Online-Reservierungen
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
                        <div className={`w-3 h-3 rounded-full ${restaurant.public_booking_enabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                        <span className="text-muted-foreground">
                          {restaurant.public_booking_enabled ? 'Aktiviert' : 'Deaktiviert'}
                        </span>
                      </div>

                      {restaurant.public_booking_enabled && restaurant.slug && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Link className="w-4 h-4" />
                              URL-Slug
                            </label>
                            <div className="flex items-center gap-2">
                              <code className="bg-card px-2 py-1 rounded text-emerald-400">{restaurant.slug}</code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/reservierung/${restaurant.slug}`);
                                }}
                                className="p-1 hover:bg-accent rounded transition-colors"
                                title="URL kopieren"
                              >
                                <Copy className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              Vorlaufzeit
                            </label>
                            <p className="text-muted-foreground">{restaurant.booking_lead_time_hours} Stunden</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Users className="w-4 h-4" />
                              Max. Personenzahl
                            </label>
                            <p className="text-muted-foreground">{restaurant.booking_max_party_size} Personen</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              Standard-Dauer
                            </label>
                            <p className="text-muted-foreground">{restaurant.booking_default_duration} Minuten</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!restaurant.address && !restaurant.phone && !restaurant.email && !descriptionText && !hasExtendedData && !restaurant.public_booking_enabled && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Noch keine zusätzlichen Informationen vorhanden.</p>
                        <p className="text-sm mt-1">Klicken Sie auf "Bearbeiten", um Informationen hinzuzufügen.</p>
                </div>
              )}
            </div>
                );
              })() : (
                <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                    <div className="p-4 bg-red-900/30 border border-red-600/50 text-red-300 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Fehler</p>
                        <p className="text-sm mt-1">{error}</p>
                      </div>
                </div>
              )}

                  <div className="space-y-2">
                    <label 
                      htmlFor="name" 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <Building2 className="w-4 h-4 text-primary" />
                  Restaurantname <span className="text-red-400">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Mein Restaurant"
                  required
                  minLength={1}
                  maxLength={200}
                      className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label 
                        htmlFor="address" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <MapPin className="w-4 h-4 text-primary" />
                  Adresse
                </label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value || null })
                  }
                  placeholder="Musterstraße 123, 12345 Musterstadt"
                  maxLength={500}
                        className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

                    <div className="space-y-2">
                      <label 
                        htmlFor="phone" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <Phone className="w-4 h-4 text-primary" />
                  Telefonnummer
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value || null })
                  }
                  placeholder="+49 123 456789"
                  maxLength={50}
                        className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
                    </div>
              </div>

                  <div className="space-y-2">
                    <label 
                      htmlFor="email" 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <Mail className="w-4 h-4 text-primary" />
                  E-Mail
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value || null })
                  }
                  placeholder="info@restaurant.de"
                  maxLength={255}
                      className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

                  <div className="space-y-2">
                    <label 
                      htmlFor="description" 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                  Beschreibung
                </label>
                <textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value || null })
                  }
                  placeholder="Beschreibung des Restaurants..."
                      rows={5}
                      className="w-full px-3 py-2 border border-input bg-card/50 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary placeholder:text-muted-foreground resize-y"
                    />
                  </div>

                  {/* Erweiterte Einstellungen */}
                  <div className="pt-6 border-t border-border space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Settings className="w-5 h-5 text-primary" />
                      Erweiterte Einstellungen
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label 
                          htmlFor="website" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Globe className="w-4 h-4 text-primary" />
                          Website
                        </label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, website: e.target.value || null })
                          }
                          placeholder="https://www.restaurant.de"
                          maxLength={500}
                          className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <label 
                          htmlFor="currency" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Euro className="w-4 h-4 text-primary" />
                          Währung
                        </label>
                        <select
                          id="currency"
                          value={formData.currency || "EUR"}
                          onChange={(e) =>
                            setFormData({ ...formData, currency: e.target.value || null })
                          }
                          className="w-full px-3 py-2 border border-input bg-card/50 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CHF">CHF (Fr)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label 
                          htmlFor="timezone" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Clock className="w-4 h-4 text-primary" />
                          Zeitzone
                        </label>
                        <select
                          id="timezone"
                          value={formData.timezone || "Europe/Berlin"}
                          onChange={(e) =>
                            setFormData({ ...formData, timezone: e.target.value || null })
                          }
                          className="w-full px-3 py-2 border border-input bg-card/50 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                        >
                          <option value="Europe/Berlin">Europa/Berlin (MEZ/MESZ)</option>
                          <option value="Europe/Vienna">Europa/Wien</option>
                          <option value="Europe/Zurich">Europa/Zürich</option>
                          <option value="Europe/Paris">Europa/Paris</option>
                          <option value="Europe/London">Europa/London</option>
                          <option value="America/New_York">Amerika/New York</option>
                          <option value="America/Los_Angeles">Amerika/Los Angeles</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label 
                          htmlFor="minReservationDuration" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Calendar className="w-4 h-4 text-primary" />
                          Mindestaufenthaltsdauer (Minuten)
                        </label>
                        <Input
                          id="minReservationDuration"
                          type="number"
                          min={15}
                          max={480}
                          step={15}
                          value={formData.minReservationDuration || 60}
                          onChange={(e) =>
                            setFormData({ ...formData, minReservationDuration: parseInt(e.target.value) || 60 })
                          }
                          className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">Standard: 60 Minuten</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label 
                        htmlFor="openingHours" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <Clock className="w-4 h-4 text-primary" />
                        Öffnungszeiten
                      </label>
                      <textarea
                        id="openingHours"
                        value={formData.openingHours || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, openingHours: e.target.value || null })
                        }
                        placeholder="z.B. Mo-Fr: 11:00-22:00, Sa-So: 12:00-23:00"
                        rows={3}
                        className="w-full px-3 py-2 border border-input bg-card/50 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary placeholder:text-muted-foreground resize-y"
                />
              </div>

                    <div className="space-y-2">
                      <label 
                        htmlFor="cancellationPolicy" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <Info className="w-4 h-4 text-primary" />
                        Stornierungsrichtlinie
                      </label>
                      <textarea
                        id="cancellationPolicy"
                        value={formData.cancellationPolicy || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, cancellationPolicy: e.target.value || null })
                        }
                        placeholder="z.B. Stornierungen bis 24 Stunden vor Reservierung kostenfrei"
                        rows={2}
                        className="w-full px-3 py-2 border border-input bg-card/50 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary placeholder:text-muted-foreground resize-y"
                      />
                    </div>
                  </div>

                  {/* SumUp Integration */}
                  <div className="pt-6 border-t border-border space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Nfc className="w-5 h-5 text-primary" />
                      SumUp Zahlungsintegration
                    </div>

                    {/* Aktivieren/Deaktivieren */}
                    <div className="flex items-center justify-between p-4 bg-accent rounded-lg border border-border">
                      <div className="space-y-1">
                        <label htmlFor="sumup_enabled" className="text-sm font-medium text-foreground cursor-pointer">
                          SumUp aktivieren
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Ermöglicht Zahlungen über SumUp Kartenterminals. Die SumUp-Konfiguration (API Key, Merchant Code) erfolgt serverseitig.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="sumup_enabled"
                          checked={formData.sumup_enabled ?? false}
                          onChange={(e) =>
                            setFormData({ ...formData, sumup_enabled: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Info-Box
                    {formData.sumup_enabled && (
                      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">SumUp-Konfiguration</p>
                            <p className="text-xs">
                              Die SumUp-Konfiguration (API Key, Merchant Code) wird serverseitig über Environment Variables verwaltet.
                              Kontaktieren Sie Ihren Administrator, um SumUp zu konfigurieren.
                            </p>
                          </div>
                        </div>
                      </div>
                    )} */}

                    {/* Standard Terminal */}
                    {formData.sumup_enabled && (
                      <div className="space-y-2">
                        <label 
                          htmlFor="sumup_default_reader_id" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Nfc className="w-4 h-4 text-primary" />
                          Standard Terminal (Reader ID)
                        </label>
                        <Input
                          id="sumup_default_reader_id"
                          type="text"
                          value={formData.sumup_default_reader_id || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, sumup_default_reader_id: e.target.value || null })
                          }
                          placeholder="z.B. rdr_3MSAFM23CK82VSTT4BN6RWSQ65"
                          maxLength={64}
                          className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: Standard-Terminal für automatische Auswahl bei Zahlungen
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Online-Reservierungen */}
                  <div className="pt-6 border-t border-border space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      Online-Reservierungen
                    </div>

                    {/* Aktivieren/Deaktivieren */}
                    <div className="flex items-center justify-between p-4 bg-accent rounded-lg border border-border">
                      <div className="space-y-1">
                        <label htmlFor="public_booking_enabled" className="text-sm font-medium text-foreground cursor-pointer">
                          Öffentliche Reservierungen aktivieren
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Ermöglicht Gästen, online über das Reservierungs-Widget zu buchen
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="public_booking_enabled"
                          checked={formData.public_booking_enabled ?? false}
                          onChange={(e) =>
                            setFormData({ ...formData, public_booking_enabled: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                      <label 
                        htmlFor="slug" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <Link className="w-4 h-4 text-emerald-400" />
                        URL-Slug
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="slug"
                          type="text"
                          value={formData.slug || ""}
                          onChange={(e) => {
                            // Nur Kleinbuchstaben, Zahlen und Bindestriche erlauben
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setFormData({ ...formData, slug: value || null });
                          }}
                          placeholder="mein-restaurant"
                          maxLength={100}
                          className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            // Slug aus Name generieren
                            const slug = formData.name
                              .toLowerCase()
                              .replace(/[äÄ]/g, 'ae')
                              .replace(/[öÖ]/g, 'oe')
                              .replace(/[üÜ]/g, 'ue')
                              .replace(/[ß]/g, 'ss')
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-|-$/g, '');
                            setFormData({ ...formData, slug });
                          }}
                          className="shrink-0"
                        >
                          Generieren
                        </Button>
                      </div>
                      {formData.slug && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Widget-URL: <code className="bg-card px-1 rounded">/reservierung/{formData.slug}</code>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Vorlaufzeit */}
                      <div className="space-y-2">
                        <label 
                          htmlFor="booking_lead_time_hours" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Clock className="w-4 h-4 text-emerald-400" />
                          Vorlaufzeit (Stunden)
                        </label>
                        <Input
                          id="booking_lead_time_hours"
                          type="number"
                          min={0}
                          max={168}
                          value={formData.booking_lead_time_hours ?? 2}
                          onChange={(e) =>
                            setFormData({ ...formData, booking_lead_time_hours: parseInt(e.target.value) || 2 })
                          }
                          className="bg-card/50 border-input text-foreground focus:border-emerald-500"
                        />
                        <p className="text-xs text-muted-foreground">Mindestens X Stunden im Voraus</p>
                      </div>

                      {/* Maximale Personenzahl */}
                      <div className="space-y-2">
                        <label 
                          htmlFor="booking_max_party_size" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Users className="w-4 h-4 text-emerald-400" />
                          Max. Personenzahl
                        </label>
                        <Input
                          id="booking_max_party_size"
                          type="number"
                          min={1}
                          max={100}
                          value={formData.booking_max_party_size ?? 12}
                          onChange={(e) =>
                            setFormData({ ...formData, booking_max_party_size: parseInt(e.target.value) || 12 })
                          }
                          className="bg-card/50 border-input text-foreground focus:border-emerald-500"
                        />
                        <p className="text-xs text-muted-foreground">Pro Online-Reservierung</p>
                      </div>

                      {/* Standard-Reservierungsdauer */}
                      <div className="space-y-2">
                        <label 
                          htmlFor="booking_default_duration" 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                        >
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          Reservierungsdauer (Min.)
                        </label>
                        <Input
                          id="booking_default_duration"
                          type="number"
                          min={30}
                          max={480}
                          step={15}
                          value={formData.booking_default_duration ?? 120}
                          onChange={(e) =>
                            setFormData({ ...formData, booking_default_duration: parseInt(e.target.value) || 120 })
                          }
                          className="bg-card/50 border-input text-foreground focus:border-emerald-500"
                        />
                        <p className="text-xs text-muted-foreground">Standard: 120 Minuten</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button 
                      type="submit" 
                      className="flex-1 gap-2 touch-manipulation min-h-[44px]" 
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Wird gespeichert...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>
                            {restaurant ? "Änderungen speichern" : "Restaurant anlegen"}
                          </span>
                        </>
                      )}
                </Button>
                {restaurant && (
                  <Button
                    type="button"
                    variant="outline"
                        onClick={handleCancel}
                        disabled={submitting}
                        className="gap-2 touch-manipulation min-h-[44px]"
                      >
                        <X className="w-4 h-4" />
                        <span>Abbrechen</span>
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
