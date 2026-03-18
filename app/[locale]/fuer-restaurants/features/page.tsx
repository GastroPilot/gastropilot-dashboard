import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  LayoutDashboard,
  MapIcon,
  Users,
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  Clock,
  Settings,
  CreditCard,
  Monitor,
  Smartphone,
  ShieldCheck,
  ScrollText,
  Gift,
  BarChart3,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features – GastroPilot",
  description: "Alle Funktionen von GastroPilot im Detail.",
};

const categories = [
  {
    label: "Reservierungen",
    features: [
      { title: "Visueller Tischplan", desc: "Drag & Drop, tages-spezifische Layouts, Echtzeit-Kapazitäten.", icon: LayoutDashboard },
      { title: "Kalender & Timeline", desc: "Tages-, Wochen-, Listenansicht. Filterbar nach Räumen und Servicezeiten.", icon: CalendarCheck },
      { title: "Reservierungssystem", desc: "KI-Tischvorschläge, Konfliktprüfung, Überbuchungsschutz, Statusverwaltung.", icon: ClipboardList },
      { title: "Warteliste", desc: "Echtzeit-Updates via SSE. Benachrichtigungen per E-Mail, SMS, WhatsApp.", icon: Clock },
      { title: "Gäste-Verwaltung", desc: "Profile, Allergien, VIP-Hinweise, Stammgast-Erkennung, Historie.", icon: Users },
      { title: "Bereiche & Standorte", desc: "Mehrere Restaurants, Bereiche, Servicewege, tages-spezifische Konfigurationen.", icon: MapIcon },
    ],
  },
  {
    label: "Bestellungen",
    features: [
      { title: "Bestellverwaltung", desc: "Menüstruktur, Kategorien, Preise, Steuersätze. Status-Tracking pro Tisch.", icon: ShoppingCart },
      { title: "SumUp-Kartenzahlung", desc: "Kontaktlos am Tisch kassieren. Automatischer Belegdruck.", icon: CreditCard },
      { title: "Küchenanzeige", desc: "Echtzeit-Bestellungen nach Priorität, Tisch und Gang sortiert.", icon: Monitor },
      { title: "Menüverwaltung", desc: "Kategorien, Artikel, Beschreibungen, Allergene, Verfügbarkeiten.", icon: UtensilsCrossed },
      { title: "Rechnungen & GoBD", desc: "TSE-Signatur, PDF-Export, Zahlungsverfolgung, KassenSichV-konform.", icon: ScrollText },
      { title: "Upsell & Gutscheine", desc: "Menü-Upgrades, Getränkepakete, Geschenkgutscheine im Bestellprozess.", icon: Gift },
      { title: "Analytics", desc: "Umsatztrends, beliebteste Gerichte, Auslastung. Export fürs Reporting.", icon: BarChart3 },
    ],
  },
  {
    label: "Team & Geräte",
    features: [
      { title: "NFC-Login", desc: "Kontaktlose Anmeldung per NFC-Tag. Alternativ PIN.", icon: ShieldCheck },
      { title: "Berechtigungen", desc: "Granulare Zugriffsrechte für Mitarbeiter, Schichtleiter, Inhaber.", icon: Settings },
      { title: "Mobile App", desc: "Native App für iPad/Tablet. Offline-fähig.", icon: Smartphone },
      { title: "Kitchen View", desc: "Dedizierte Küchen-Ansicht auf separatem Bildschirm.", icon: Monitor },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main>
      <section className="px-4 pb-16 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">Features</p>
          <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] tracking-tight">
            Alle Abläufe,
            <br />
            <span className="text-muted-foreground">eine Plattform.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Tischplan, Gästedatenbank, Bestellsystem, Kartenzahlung, Mobile App und Küchenanzeige in einer Oberfläche.
          </p>
        </div>
      </section>

      {categories.map((cat) => (
        <section key={cat.label} className="border-t px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-lg font-semibold tracking-tight">{cat.label}</h2>
            <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {cat.features.map((f) => (
                <div key={f.title} className="bg-card p-6">
                  <f.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="border-t px-4 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-xl font-semibold tracking-tight">Bereit?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Finde das passende Paket oder vereinbare eine Beratung.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/fuer-restaurants/pricing" className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:bg-foreground/90">Preise</Link>
            <Link href="/kontakt" className="rounded-full border px-5 py-2.5 text-[14px] font-semibold hover:bg-accent">Kontakt</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
