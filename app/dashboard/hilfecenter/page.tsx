"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  CircleHelp,
  FileClock,
  FileText,
  Filter,
  LayoutGrid,
  type LucideIcon,
  Monitor,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuickStep = {
  title: string;
  description: string;
  links: Array<{ label: string; href: string }>;
  icon: LucideIcon;
};

type ModuleItem = {
  title: string;
  href: string;
  description: string;
  highlights: string[];
  roleHint: string;
  icon: LucideIcon;
};

type StatusItem = {
  label: string;
  key: string;
  meaning: string;
  tone: string;
};

const quickStartSteps: QuickStep[] = [
  {
    title: "Tenant-Kontext prüfen",
    description:
      "Als Plattform-Admin im Grundstatus zuerst einen Tenant auswählen, damit Dashboard-Daten geladen werden.",
    links: [
      { label: "Tenants", href: "/dashboard/restaurants" },
      { label: "Übersicht", href: "/dashboard" },
    ],
    icon: Building2,
  },
  {
    title: "Tagesgeschäft überwachen",
    description:
      "Belegung, Reservierungen und Bestellungen über Übersicht, Tischplan, Zeitplan und Listenansichten prüfen.",
    links: [
      { label: "Übersicht", href: "/dashboard" },
      { label: "Tischplan", href: "/dashboard/tischplan" },
      { label: "Zeitplan", href: "/dashboard/timeline" },
      { label: "Reservierungen", href: "/dashboard/reservations" },
      { label: "Bestellhistorie", href: "/dashboard/order-history" },
    ],
    icon: LayoutGrid,
  },
  {
    title: "Verwaltung einrichten",
    description:
      "Geräte/KDS und Compliance-Bereiche (TSE) in der Verwaltung pflegen.",
    links: [
      { label: "Geräte / KDS", href: "/dashboard/devices" },
      { label: "TSE / KassenSichV", href: "/dashboard/fiskaly" },
    ],
    icon: Wrench,
  },
];

const moduleGroups: Array<{ title: string; items: ModuleItem[] }> = [
  {
    title: "Tagesgeschäft",
    items: [
      {
        title: "Übersicht",
        href: "/dashboard",
        description: "Live-Kennzahlen zu Umsatz, Reservierungen, Bestellstatus und Auslastung.",
        highlights: ["Zeiträume 7/30/90 Tage", "KPI- und Trendkarten", "Top-Kategorien & Stundenlast"],
        roleHint: "Alle Rollen",
        icon: BarChart3,
      },
      {
        title: "Tischplan",
        href: "/dashboard/tischplan",
        description: "Visuelle Tischansicht mit Bereichsfilter, Reservierungen, Blocks und Zoom.",
        highlights: ["Reservierungsübersicht links", "Bereichsauswahl", "Tisch-/Bestelldetails im Dialog (Lesemodus)"],
        roleHint: "Alle Rollen mit Tenant-Kontext",
        icon: LayoutGrid,
      },
      {
        title: "Zeitplan",
        href: "/dashboard/timeline",
        description: "Zeitachsenansicht pro Bereich/Tisch mit Status- und Intervallfiltern.",
        highlights: ["15/30/60-Minuten-Raster", "Statusfilter inkl. Block", "Unzugeordnete Reservierungen"],
        roleHint: "Alle Rollen mit Tenant-Kontext",
        icon: Calendar,
      },
      {
        title: "Reservierungen",
        href: "/dashboard/reservations",
        description: "Tabellarische Tagesansicht für Reservierungen und Blockierungen.",
        highlights: ["Datumssprung", "Suche + Tischfilter", "Statusfilter werden gespeichert"],
        roleHint: "Alle Rollen mit Tenant-Kontext",
        icon: Users,
      },
      {
        title: "Bestellhistorie",
        href: "/dashboard/order-history",
        description: "Filterbare Bestellungsliste mit Zahlungsstatus und CSV-Export.",
        highlights: ["Status-/Datums-/Tischfilter", "Volltextsuche", "CSV-Export"],
        roleHint: "Alle Rollen mit Tenant-Kontext",
        icon: FileClock,
      },
      {
        title: "Bestellstatistiken",
        href: "/dashboard/order-statistics",
        description: "Umsatz-, Artikel-, Kategorien- und Stundenanalysen für Bestellungen.",
        highlights: ["Datum von/bis", "Top-Artikel", "Umsatz nach Stunde"],
        roleHint: "Manager",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Verwaltung & System",
    items: [
      {
        title: "Geräte / KDS",
        href: "/dashboard/devices",
        description: "Kitchen-Display-Geräte registrieren, zuordnen und Tokens verwalten.",
        highlights: ["Station wählen", "Online/Offline-Status", "Token erneuern"],
        roleHint: "Owner / Platform-Admin",
        icon: Monitor,
      },
      {
        title: "Kennzahlen",
        href: "/dashboard/owner-insights",
        description: "Eigentümer-Dashboard mit KPI-Karten, Pipeline, Kanälen und Export.",
        highlights: ["CSV/PDF-Export", "Statusfilter", "Zeitraum-Presets + Custom"],
        roleHint: "Owner / Platform-Admin",
        icon: BarChart3,
      },
      {
        title: "TSE / KassenSichV",
        href: "/dashboard/fiskaly",
        description: "Cloud-TSE einrichten, Transaktionen prüfen, Exporte erzeugen und herunterladen.",
        highlights: ["TSS-Status", "Transaktionsliste", "Finanzamt-Export (TAR)"],
        roleHint: "Owner / Platform-Admin",
        icon: Shield,
      },
      {
        title: "Audit-Logs",
        href: "/dashboard/audit-logs",
        description: "Systemereignisse nach Aktion, User und Zeitraum filtern und nachvollziehen.",
        highlights: ["Detail-Ansicht pro Log", "Freitextsuche", "Pagination"],
        roleHint: "Owner / Manager / Platform-Admin",
        icon: FileText,
      },
      {
        title: "Benutzereinstellungen",
        href: "/dashboard/user-settings",
        description: "Persönliche Einstellungen, z. B. Bestätigungsdialoge, pro Nutzer steuern.",
        highlights: ["Bestätigungsfenster an/aus", "Gespeicherte Settings", "Einzelne Keys löschen"],
        roleHint: "Alle Rollen",
        icon: Settings,
      },
    ],
  },
];

const reservationStatuses: StatusItem[] = [
  { label: "Ausstehend", key: "pending", meaning: "Reservierung ist angelegt, aber noch nicht bestätigt.", tone: "bg-blue-900/30 border-blue-700/50 text-blue-200" },
  { label: "Bestätigt", key: "confirmed", meaning: "Reservierung bestätigt, Tisch kann zugeordnet sein.", tone: "bg-indigo-900/30 border-indigo-700/50 text-indigo-200" },
  { label: "Platziert", key: "seated", meaning: "Gäste sind im Haus und sitzen am Tisch.", tone: "bg-emerald-900/30 border-emerald-700/50 text-emerald-200" },
  { label: "Abgeschlossen", key: "completed", meaning: "Vorgang beendet.", tone: "bg-amber-900/30 border-amber-700/50 text-amber-200" },
  { label: "Storniert", key: "canceled", meaning: "Reservierung wurde storniert.", tone: "bg-red-900/30 border-red-700/50 text-red-200" },
  { label: "No-Show", key: "no_show", meaning: "Gast ist nicht erschienen.", tone: "bg-orange-900/30 border-orange-700/50 text-orange-200" },
  { label: "Block", key: "block", meaning: "Zeitfenster/Tisch ist blockiert.", tone: "bg-rose-900/30 border-rose-700/50 text-rose-200" },
];

const orderStatuses: StatusItem[] = [
  { label: "Offen", key: "open", meaning: "Bestellung wurde angelegt.", tone: "bg-blue-900/30 border-blue-700/50 text-blue-200" },
  { label: "An Küche gesendet", key: "sent_to_kitchen", meaning: "Bestellung ist an die Küche übergeben.", tone: "bg-indigo-900/30 border-indigo-700/50 text-indigo-200" },
  { label: "In Zubereitung", key: "in_preparation", meaning: "Küche bearbeitet den Auftrag.", tone: "bg-yellow-900/30 border-yellow-700/50 text-yellow-200" },
  { label: "Fertig", key: "ready", meaning: "Gericht ist bereit zur Ausgabe.", tone: "bg-emerald-900/30 border-emerald-700/50 text-emerald-200" },
  { label: "Serviert", key: "served", meaning: "Bestellung wurde serviert.", tone: "bg-green-900/30 border-green-700/50 text-green-200" },
  { label: "Bezahlt", key: "paid", meaning: "Zahlung abgeschlossen.", tone: "bg-amber-900/30 border-amber-700/50 text-amber-200" },
  { label: "Storniert", key: "canceled", meaning: "Bestellung wurde storniert.", tone: "bg-red-900/30 border-red-700/50 text-red-200" },
];

const roleHints = [
  {
    role: "Platform-Admin",
    scope: "Kann Tenants wechseln (Impersonation) und globale Admin-Aufgaben ausführen.",
  },
  {
    role: "Owner",
    scope: "Volle Restaurant-Verwaltung inkl. Geräte, Abrechnung, Fiskaly, Bediener.",
  },
  {
    role: "Manager",
    scope: "Operatives Management inkl. Reservierungen, Bestellstatistiken und Audit-Logs.",
  },
  {
    role: "Mitarbeiter",
    scope: "Tagesgeschäft-Ansichten und persönliche Einstellungen (sichtbar je nach Freigabe).",
  },
];

const faqItems = [
  {
    question: "Warum sehe ich keine Daten im Dashboard?",
    answer:
      "Prüfe zuerst den Tenant-/Restaurant-Kontext. Im Grundstatus (Platform-Admin ohne Tenant) sind viele Datenansichten bewusst leer.",
  },
  {
    question: "Warum bleiben meine Statusfilter erhalten?",
    answer:
      "Filter in Reservierungen, Zeitplan und Bestellhistorie werden pro Benutzer in den Benutzereinstellungen gespeichert.",
  },
  {
    question: "Wo exportiere ich Daten?",
    answer:
      "Bestellhistorie exportiert CSV. Kennzahlen exportiert CSV/PDF. TSE/Fiskaly exportiert TAR-Archive für Prüfzwecke.",
  },
  {
    question: "Welche Bereiche sind eher Monitoring statt Bearbeitung?",
    answer:
      "Zeitplan, Tischplan, Reservierungen und Bestellhistorie bieten aktuell primär Übersicht/Detailansicht; Bearbeitung hängt von der jeweiligen Oberfläche und Rolle ab.",
  },
];

export default function HilfecenterPage() {
  return (
    <div className="h-full min-h-screen flex flex-col bg-background text-foreground overflow-auto">
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-[#F95100]/25">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Hilfecenter</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Bedienung der GastroPilot-App</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CircleHelp className="w-5 h-5 text-primary" />
                Was ist neu im Hilfecenter?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground space-y-2">
              <p>
                Dieses Hilfecenter wurde auf den aktuellen Stand der Dashboard-Module gebracht und deckt jetzt
                Tagesgeschäft, Verwaltung, Systembereiche, Rollen sowie die Status-Legenden für Reservierungen
                und Bestellungen ab.
              </p>
              <p>
                Menüpunkte können je nach Rolle und Tenant-Kontext variieren.
              </p>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Schnellstart
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {quickStartSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title} className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="border-b border-border">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted">
                          <Icon className="w-4 h-4 text-primary" />
                        </span>
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {step.links.map((link) => (
                          <Link
                            key={`${step.title}-${link.href}`}
                            href={link.href}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 text-xs text-foreground hover:border-primary hover:text-primary transition-colors"
                          >
                            {link.label}
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {moduleGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                {group.title === "Tagesgeschäft" ? (
                  <LayoutGrid className="w-5 h-5 text-primary" />
                ) : (
                  <Wrench className="w-5 h-5 text-primary" />
                )}
                {group.title}
              </h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.href} className="border-border bg-card/50 backdrop-blur-sm">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-base text-foreground flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted shrink-0">
                              <Icon className="w-4 h-4 text-primary" />
                            </span>
                            <Link href={item.href} className="truncate hover:text-primary transition-colors">
                              {item.title}
                            </Link>
                          </span>
                          <span className="text-[11px] font-medium px-2 py-1 rounded-md border border-border bg-background/70 text-muted-foreground whitespace-nowrap">
                            {item.roleHint}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {item.highlights.map((highlight) => (
                            <li key={`${item.title}-${highlight}`}>{highlight}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Reservierungsstatus
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {reservationStatuses.map((status) => (
                  <div
                    key={status.key}
                    className={`rounded-lg border px-3 py-2 text-xs md:text-sm ${status.tone}`}
                  >
                    <div className="font-semibold">{status.label}</div>
                    <div className="opacity-90">{status.meaning}</div>
                    <div className="text-[11px] opacity-80 mt-1">Key: {status.key}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Bestellstatus
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {orderStatuses.map((status) => (
                  <div
                    key={status.key}
                    className={`rounded-lg border px-3 py-2 text-xs md:text-sm ${status.tone}`}
                  >
                    <div className="font-semibold">{status.label}</div>
                    <div className="opacity-90">{status.meaning}</div>
                    <div className="text-[11px] opacity-80 mt-1">Key: {status.key}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Rollenüberblick
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid md:grid-cols-2 gap-3">
              {roleHints.map((entry) => (
                <div key={entry.role} className="rounded-lg border border-border bg-background/70 px-3 py-2">
                  <div className="text-sm font-semibold text-foreground">{entry.role}</div>
                  <div className="text-xs text-muted-foreground mt-1">{entry.scope}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Häufige Fragen
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-sm font-semibold text-foreground">{item.question}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="h-16" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
