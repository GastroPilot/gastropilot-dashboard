"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Clock,
  Bell,
  ShoppingBag,
  Globe,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Link,
  ExternalLink,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import { DropdownSelector } from "@/components/area-selector";
import { restaurantsApi } from "@/lib/api/restaurants";
import { impersonation } from "@/lib/api/admin";
import { authApi } from "@/lib/api/auth";
import {
  tenantSettingsApi,
  TenantSettings,
  OpeningHours,
  DayHours,
  DEFAULT_TENANT_SETTINGS,
} from "@/lib/api/tenant-settings";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error";
}

let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, variant: Toast["variant"] = "success") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-background ${
        checked
          ? "bg-primary/80 shadow-[0_10px_24px_rgba(249,81,0,0.35)] hover:-translate-y-[1px]"
          : "bg-muted hover:bg-accent hover:-translate-y-[1px]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Wochentage ───────────────────────────────────────────────────────────────

const DAYS: { key: keyof OpeningHours; label: string }[] = [
  { key: "monday",    label: "Montag" },
  { key: "tuesday",   label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday",  label: "Donnerstag" },
  { key: "friday",    label: "Freitag" },
  { key: "saturday",  label: "Samstag" },
  { key: "sunday",    label: "Sonntag" },
];

const DEFAULT_DAY: DayHours = { open: "09:00", close: "22:00", closed: false };

function buildDefaultOpeningHours(): OpeningHours {
  return Object.fromEntries(DAYS.map(({ key }) => [key, { ...DEFAULT_DAY }])) as OpeningHours;
}

// ─── Sektion ──────────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
  onSave,
  saving,
  error,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  error?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 shadow-lg shadow-black/20 overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-background/70">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="ml-4 flex-shrink-0 min-w-[90px]"
        >
          {saving ? "Speichert…" : "Speichern"}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border-b border-red-600/30 text-red-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="p-4 space-y-5">{children}</div>
    </div>
  );
}

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 ${
        wide ? "" : "sm:flex-row sm:items-start sm:justify-between"
      }`}
    >
      <div className="text-sm min-w-0 sm:max-w-xs">
        <div className="font-semibold text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className={`flex-shrink-0 ${wide ? "" : "sm:ml-4"}`}>{children}</div>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const widthClass = className ?? "w-full sm:w-56";
  return (
    <DropdownSelector
      options={options.map((option) => ({ id: option.value, label: option.label }))}
      selectedId={value}
      onSelect={onChange}
      placeholder="Auswählen"
      triggerClassName={`h-9 md:h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-between gap-2 ${widthClass}`}
      menuWidthClassName="w-full"
      zIndexClassName="z-[140]"
    />
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function TenantSettingsPage() {
  const { toasts, add: addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [noTenantContext, setNoTenantContext] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [savingContact, setSavingContact] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [contactError, setContactError] = useState("");

  // ── Stammdaten ───────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  // ── Allgemein ────────────────────────────────────────────────────────────
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TENANT_SETTINGS.timezone);
  const [currency, setCurrency] = useState(DEFAULT_TENANT_SETTINGS.currency);
  const [language, setLanguage] = useState(DEFAULT_TENANT_SETTINGS.language);
  const [orderPrefix, setOrderPrefix] = useState(DEFAULT_TENANT_SETTINGS.order_number_prefix);
  const [taxRate, setTaxRate] = useState(String(DEFAULT_TENANT_SETTINGS.tax_rate));
  const [receiptFooter, setReceiptFooter] = useState("");

  // ── Online-Buchung ───────────────────────────────────────────────────────
  const [slug, setSlug] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(DEFAULT_TENANT_SETTINGS.public_booking_enabled);
  const [leadTime, setLeadTime] = useState(String(DEFAULT_TENANT_SETTINGS.booking_lead_time_hours));
  const [maxParty, setMaxParty] = useState(String(DEFAULT_TENANT_SETTINGS.booking_max_party_size));
  const [defaultDuration, setDefaultDuration] = useState(
    String(DEFAULT_TENANT_SETTINGS.booking_default_duration_minutes)
  );

  // ── Öffnungszeiten ───────────────────────────────────────────────────────
  const [openingHours, setOpeningHours] = useState<OpeningHours>(buildDefaultOpeningHours());

  // ── Benachrichtigungen ───────────────────────────────────────────────────
  const [notifyEmail, setNotifyEmail] = useState(DEFAULT_TENANT_SETTINGS.notify_new_reservation_email);
  const [notifyPush, setNotifyPush] = useState(DEFAULT_TENANT_SETTINGS.notify_new_order_push);

  // ── Daten laden ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Grundstatus-Erkennung: platform_admin ohne Impersonation hat keinen Tenant-Kontext
        const user = await authApi.getCurrentUser();
        const isPlatformAdmin = user.role === "platform_admin";
        const isImpersonating = impersonation.isActive();
        if (isPlatformAdmin && !isImpersonating) {
          setNoTenantContext(true);
          setLoading(false);
          return;
        }

        const [restaurants] = await Promise.all([restaurantsApi.list()]);
        if (!restaurants.length) return;
        const r = restaurants[0];
        setRestaurantId(r.id);

        // Stammdaten
        setName(r.name ?? "");
        setAddress(r.address ?? "");
        setPhone(r.phone ?? "");
        setEmail(r.email ?? "");
        // Beschreibung: alten __EXTENDED_DATA__ Hack herausfiltern
        const rawDesc = r.description ?? "";
        setDescription(rawDesc.includes("__EXTENDED_DATA__")
          ? rawDesc.split("__EXTENDED_DATA__")[0]
          : rawDesc
        );
        // Slug
        setSlug(r.slug ?? "");

        // Tenant-Settings
        const s: TenantSettings = await tenantSettingsApi.getSettings(String(r.id));

        setWebsite(typeof s.website === "string" ? s.website : "");
        setTimezone(s.timezone ?? DEFAULT_TENANT_SETTINGS.timezone);
        setCurrency(s.currency ?? DEFAULT_TENANT_SETTINGS.currency);
        setLanguage(s.language ?? DEFAULT_TENANT_SETTINGS.language);
        setOrderPrefix(s.order_number_prefix ?? DEFAULT_TENANT_SETTINGS.order_number_prefix);
        setTaxRate(String(s.tax_rate ?? DEFAULT_TENANT_SETTINGS.tax_rate));
        setReceiptFooter(s.receipt_footer ?? "");

        setBookingEnabled(s.public_booking_enabled ?? DEFAULT_TENANT_SETTINGS.public_booking_enabled);
        setLeadTime(String(s.booking_lead_time_hours ?? DEFAULT_TENANT_SETTINGS.booking_lead_time_hours));
        setMaxParty(String(s.booking_max_party_size ?? DEFAULT_TENANT_SETTINGS.booking_max_party_size));
        setDefaultDuration(
          String(s.booking_default_duration_minutes ?? DEFAULT_TENANT_SETTINGS.booking_default_duration_minutes)
        );

        if (s.opening_hours) {
          const merged: OpeningHours = { ...buildDefaultOpeningHours() };
          for (const { key } of DAYS) {
            if (s.opening_hours[key]) merged[key] = { ...DEFAULT_DAY, ...s.opening_hours[key] };
          }
          setOpeningHours(merged);
        }

        setNotifyEmail(s.notify_new_reservation_email ?? DEFAULT_TENANT_SETTINGS.notify_new_reservation_email);
        setNotifyPush(s.notify_new_order_push ?? DEFAULT_TENANT_SETTINGS.notify_new_order_push);
      } catch {
        addToast("Einstellungen konnten nicht geladen werden.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  // ── Slug aus Name generieren ─────────────────────────────────────────────
  const generateSlug = () => {
    const generated = name
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generated);
  };

  // ── Validierung Kontakt ──────────────────────────────────────────────────
  const validateContact = (): boolean => {
    if (!name.trim()) { setContactError("Restaurantname ist erforderlich."); return false; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setContactError("Bitte eine gültige E-Mail-Adresse eingeben."); return false;
    }
    if (phone.trim() && !/^[\d\s+\-()]+$/.test(phone.trim())) {
      setContactError("Bitte eine gültige Telefonnummer eingeben."); return false;
    }
    setContactError("");
    return true;
  };

  // ── Speichern: Stammdaten ────────────────────────────────────────────────
  const saveContact = async () => {
    if (!restaurantId || !validateContact()) return;
    setSavingContact(true);
    try {
      await restaurantsApi.update(restaurantId, {
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        description: description.trim() || null,
      });
      addToast("Stammdaten gespeichert.", "success");
    } catch {
      addToast("Fehler beim Speichern.", "error");
    } finally {
      setSavingContact(false);
    }
  };

  // ── Speichern: Allgemein ─────────────────────────────────────────────────
  const saveGeneral = async () => {
    if (!restaurantId) return;
    setSavingGeneral(true);
    try {
      await tenantSettingsApi.updateSettings(String(restaurantId), {
        website: website.trim() || null,
        timezone,
        currency,
        language,
        order_number_prefix: orderPrefix,
        tax_rate: parseFloat(taxRate) || 0,
        receipt_footer: receiptFooter.trim() || null,
      } as any);
      addToast("Allgemeine Einstellungen gespeichert.", "success");
    } catch {
      addToast("Fehler beim Speichern.", "error");
    } finally {
      setSavingGeneral(false);
    }
  };

  // ── Speichern: Online-Buchung (Restaurant + TenantSettings) ─────────────
  const saveBooking = async () => {
    if (!restaurantId) return;
    setSavingBooking(true);
    try {
      await Promise.all([
        restaurantsApi.update(restaurantId, {
          slug: slug.trim() || null,
        }),
        tenantSettingsApi.updateSettings(String(restaurantId), {
          public_booking_enabled: bookingEnabled,
          booking_lead_time_hours: parseInt(leadTime) || 0,
          booking_max_party_size: parseInt(maxParty) || 1,
          booking_default_duration_minutes: parseInt(defaultDuration) || 60,
        }),
      ]);
      addToast("Buchungseinstellungen gespeichert.", "success");
    } catch {
      addToast("Fehler beim Speichern.", "error");
    } finally {
      setSavingBooking(false);
    }
  };

  // ── Speichern: Öffnungszeiten ────────────────────────────────────────────
  const saveHours = async () => {
    if (!restaurantId) return;
    setSavingHours(true);
    try {
      await tenantSettingsApi.updateSettings(String(restaurantId), { opening_hours: openingHours });
      addToast("Öffnungszeiten gespeichert.", "success");
    } catch {
      addToast("Fehler beim Speichern.", "error");
    } finally {
      setSavingHours(false);
    }
  };

  // ── Speichern: Benachrichtigungen ────────────────────────────────────────
  const saveNotifications = async () => {
    if (!restaurantId) return;
    setSavingNotifications(true);
    try {
      await tenantSettingsApi.updateSettings(String(restaurantId), {
        notify_new_reservation_email: notifyEmail,
        notify_new_order_push: notifyPush,
      });
      addToast("Benachrichtigungen gespeichert.", "success");
    } catch {
      addToast("Fehler beim Speichern.", "error");
    } finally {
      setSavingNotifications(false);
    }
  };

  // ── Öffnungszeiten-Helfer ────────────────────────────────────────────────
  const setDayField = (day: keyof OpeningHours, field: keyof DayHours, value: string | boolean) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? DEFAULT_DAY), [field]: value },
    }));
  };

  if (loading) return <LoadingOverlay />;

  if (noTenantContext) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="max-w-sm text-center space-y-3 px-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Kein Tenant ausgewählt</h2>
          <p className="text-sm text-muted-foreground">
            Du befindest dich im Grundstatus. Wähle zuerst einen Tenant über die{" "}
            <a href="/dashboard/restaurants" className="text-primary underline underline-offset-2">
              Tenant-Verwaltung
            </a>{" "}
            aus, um dessen Einstellungen zu bearbeiten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                t.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : "bg-green-900/80 border-green-500 text-green-50"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-lg shadow-[#F95100]/25">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Restaurant-Einstellungen</h1>
              <p className="text-sm text-muted-foreground">
                Stammdaten, Öffnungszeiten, Buchung und Benachrichtigungen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">

          {/* ── Stammdaten ── */}
          <Section
            icon={Building2}
            title="Stammdaten"
            description="Name, Adresse und Kontaktinformationen Ihres Restaurants."
            onSave={saveContact}
            saving={savingContact}
            error={contactError}
          >
            <FieldRow label="Restaurantname" hint="Pflichtfeld – wird in der App und auf Belegen angezeigt.">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mein Restaurant"
                className="w-full sm:w-72"
              />
            </FieldRow>

            <FieldRow label="Adresse">
              <div className="flex items-center gap-2 w-full sm:w-72">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Musterstraße 1, 12345 Stadt"
                />
              </div>
            </FieldRow>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Telefon">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+49 123 456789"
                    className="w-full"
                  />
                </div>
              </FieldRow>

              <FieldRow label="E-Mail">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@restaurant.de"
                    className="w-full"
                  />
                </div>
              </FieldRow>
            </div>

            <FieldRow label="Beschreibung" hint="Optionale Kurzbeschreibung des Restaurants." wide>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreiben Sie Ihr Restaurant..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none placeholder:text-muted-foreground"
              />
            </FieldRow>
          </Section>

          {/* ── Allgemein ── */}
          <Section
            icon={Globe}
            title="Allgemein"
            description="Zeitzone, Währung, Sprache und weitere Grundeinstellungen."
            onSave={saveGeneral}
            saving={savingGeneral}
          >
            <FieldRow label="Website">
              <div className="flex items-center gap-2 w-full sm:w-72">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.mein-restaurant.de"
                />
              </div>
            </FieldRow>

            <FieldRow label="Zeitzone">
              <SelectField
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: "Europe/Berlin", label: "Europa/Berlin (MEZ/MESZ)" },
                  { value: "Europe/Vienna", label: "Europa/Wien" },
                  { value: "Europe/Zurich", label: "Europa/Zürich" },
                  { value: "Europe/Paris", label: "Europa/Paris" },
                  { value: "Europe/London", label: "Europa/London" },
                  { value: "America/New_York", label: "Amerika/New York" },
                  { value: "America/Los_Angeles", label: "Amerika/Los Angeles" },
                  { value: "UTC", label: "UTC" },
                ]}
              />
            </FieldRow>

            <FieldRow label="Währung">
              <SelectField
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: "EUR", label: "EUR – Euro" },
                  { value: "USD", label: "USD – US-Dollar" },
                  { value: "GBP", label: "GBP – Pfund Sterling" },
                  { value: "CHF", label: "CHF – Schweizer Franken" },
                ]}
              />
            </FieldRow>

            <FieldRow label="Sprache">
              <SelectField
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "de", label: "Deutsch" },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "it", label: "Italiano" },
                ]}
              />
            </FieldRow>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <FieldRow
                label="Bestellnummer-Präfix"
                hint={`Vorangestelltes Kürzel, z.\u00A0B. "B" \u2192 B-0001.`}
              >
                <Input
                  value={orderPrefix}
                  onChange={(e) => setOrderPrefix(e.target.value)}
                  placeholder="B"
                  className="w-24"
                />
              </FieldRow>

              <FieldRow label="MwSt.-Satz (%)" hint="Standard-Mehrwertsteuersatz.">
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  min={0}
                  max={100}
                  className="w-24"
                />
              </FieldRow>
            </div>

            <FieldRow label="Bon-Fußzeile" hint="Wird unter jedem Kassenbon gedruckt (optional)." wide>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Vielen Dank für Ihren Besuch!"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none placeholder:text-muted-foreground"
              />
            </FieldRow>
          </Section>

          {/* ── Online-Buchung ── */}
          <Section
            icon={ShoppingBag}
            title="Online-Buchung"
            description="Öffentlicher Reservierungslink und Buchungsregeln."
            onSave={saveBooking}
            saving={savingBooking}
          >
            <FieldRow
              label="Öffentliche Buchung"
              hint="Erlaubt Gästen, Reservierungen über den Web-Link vorzunehmen."
            >
              <Toggle checked={bookingEnabled} onChange={setBookingEnabled} />
            </FieldRow>

            <FieldRow
              label="URL-Slug"
              hint="Eindeutiger Kurz-Link für das Reservierungs-Widget."
              wide
            >
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                      placeholder="mein-restaurant"
                      className="flex-1"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={generateSlug}>
                    Generieren
                  </Button>
                </div>
                {slug && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Widget-URL:{" "}
                      <code className="bg-card/80 border border-border px-1 rounded">
                        /reservierung/{slug}
                      </code>
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Link className="w-3 h-3" />
                        Personal-Login-URL:{" "}
                        <code className="bg-card/80 border border-border px-1 rounded">
                          /login?t={slug}
                        </code>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/login?t=${slug}`;
                          navigator.clipboard.writeText(url);
                        }}
                        className="text-xs text-primary hover:underline flex-shrink-0"
                      >
                        Kopieren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </FieldRow>

            <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FieldRow label="Vorlaufzeit (h)" hint="Mindestvorlaufzeit für Buchungen.">
                <Input
                  type="number"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  min={0}
                  max={168}
                  className="w-24"
                />
              </FieldRow>

              <FieldRow label="Max. Personen" hint="Größte buchbare Gruppe.">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="number"
                    value={maxParty}
                    onChange={(e) => setMaxParty(e.target.value)}
                    min={1}
                    max={500}
                    className="w-20"
                  />
                </div>
              </FieldRow>

              <FieldRow label="Aufenthaltsdauer" hint="Standard-Tischdauer.">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <SelectField
                    value={defaultDuration}
                    onChange={setDefaultDuration}
                    className="w-full"
                    options={[
                      { value: "30",  label: "30 Min." },
                      { value: "60",  label: "1 Stunde" },
                      { value: "90",  label: "1,5 Std." },
                      { value: "120", label: "2 Stunden" },
                      { value: "150", label: "2,5 Std." },
                      { value: "180", label: "3 Stunden" },
                      { value: "240", label: "4 Stunden" },
                    ]}
                  />
                </div>
              </FieldRow>
            </div>
          </Section>

          {/* ── Öffnungszeiten ── */}
          <Section
            icon={Clock}
            title="Öffnungszeiten"
            description="Reguläre Öffnungszeiten pro Wochentag."
            onSave={saveHours}
            saving={savingHours}
          >
            <div className="space-y-3">
              {DAYS.map(({ key, label }) => {
                const day = openingHours[key] ?? DEFAULT_DAY;
                const isClosed = day.closed ?? false;
                return (
                  <div
                    key={key}
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: "130px auto 1fr" }}
                  >
                    <span className="text-sm font-semibold text-foreground">{label}</span>

                    <Toggle
                      checked={!isClosed}
                      onChange={(open) => setDayField(key, "closed", !open)}
                    />

                    {!isClosed ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Öffnet</span>
                          <input
                            type="time"
                            value={day.open ?? "09:00"}
                            onChange={(e) => setDayField(key, "open", e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Schließt</span>
                          <input
                            type="time"
                            value={day.close ?? "22:00"}
                            onChange={(e) => setDayField(key, "close", e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Geschlossen</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Benachrichtigungen ── */}
          <Section
            icon={Bell}
            title="Benachrichtigungen"
            description="Automatische Benachrichtigungen bei neuen Ereignissen."
            onSave={saveNotifications}
            saving={savingNotifications}
          >
            <FieldRow
              label="E-Mail bei neuer Reservierung"
              hint="Sendet eine E-Mail, sobald eine neue Reservierung eingeht."
            >
              <Toggle checked={notifyEmail} onChange={setNotifyEmail} />
            </FieldRow>

            <FieldRow
              label="Push bei neuer Bestellung"
              hint="Sendet eine Push-Benachrichtigung, sobald eine neue Bestellung eingeht."
            >
              <Toggle checked={notifyPush} onChange={setNotifyPush} />
            </FieldRow>
          </Section>

        </div>
      </div>
    </div>
  );
}
