import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  LayoutDashboard,
  MapPinHouse,
  Users2,
  ShieldCheck,
  ChevronDown,
  Star,
  Smartphone,
  CreditCard,
  BarChart3,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Für Restaurants – GastroPilot Software",
  description:
    "GastroPilot ist die moderne Reservierungs- und Bestellungssoftware für Restaurants.",
};

const features = [
  {
    title: "Tischplan & Kalender",
    description: "Drag & Drop Tischzuweisung, Echtzeit-Auslastung, Tages-/Wochen-/Agendaansicht.",
    icon: LayoutDashboard,
  },
  {
    title: "Reservierungssystem",
    description: "Automatische Zeitslots, Konflikterkennung, Warteliste und Überbuchungsschutz.",
    icon: CalendarClock,
  },
  {
    title: "Bestellungen & Zahlung",
    description: "Speisekarte digital, Bestellungen per App, SumUp-Kartenzahlung am Tisch.",
    icon: CreditCard,
  },
  {
    title: "Gäste-Management",
    description: "Allergien, Präferenzen, VIP-Hinweise. NFC-Login für schnellen Schichtwechsel.",
    icon: Users2,
  },
  {
    title: "KPI-Dashboard",
    description: "Umsatztrends, beliebteste Gerichte, Auslastung auf einen Blick.",
    icon: BarChart3,
  },
  {
    title: "Mobile App & KDS",
    description: "Native iPad/Tablet App. Dedizierte Küchenanzeige mit Echtzeit-Bestellungen.",
    icon: Smartphone,
  },
];

const testimonials = [
  {
    quote: "Seit wir GastroPilot nutzen, haben wir den Überblick über alle Reservierungen und können unseren Service viel besser planen.",
    name: "Marco Rossi",
    role: "Ristorante Bella Vista",
  },
  {
    quote: "Der visuelle Tischplan hat unsere Abläufe komplett verändert. Keine doppelten Buchungen mehr.",
    name: "Sarah Weber",
    role: "Gasthaus zum Löwen",
  },
  {
    quote: "Die Kombination aus Reservierungs- und Bestellsystem spart uns täglich Zeit. Der Support ist erstklassig.",
    name: "Thomas Müller",
    role: "Cafe Central",
  },
];

const faqs = [
  { q: "Was kostet GastroPilot?", a: "Ab 129 EUR/Monat (Starter) bis 449 EUR/Monat (Premium). Einmalige Einrichtung: 99 EUR." },
  { q: "Ist GastroPilot DSGVO-konform?", a: "Ja. EU-Hosting, Datenverarbeitung ausschliesslich in der EU." },
  { q: "Gibt es eine Mobile App?", a: "Ja, native App für iPad und Tablet (iOS & Android) mit Reservierungen, Bestellungen und Küchenanzeige." },
  { q: "Wie funktioniert die Kartenzahlung?", a: "Nahtlose SumUp-Integration. Kontaktlos kassieren am Tisch, GoBD-konforme Belege automatisch." },
];

const tables = [
  { label: "01", seats: 2, status: "free" as const },
  { label: "02", seats: 4, status: "occupied" as const },
  { label: "03", seats: 4, status: "occupied" as const },
  { label: "04", seats: 6, status: "reserved" as const },
  { label: "05", seats: 2, status: "free" as const },
  { label: "06", seats: 4, status: "reserved" as const },
  { label: "07", seats: 2, status: "occupied" as const },
  { label: "08", seats: 6, status: "free" as const },
  { label: "09", seats: 8, status: "reserved" as const },
  { label: "10", seats: 2, status: "free" as const },
  { label: "11", seats: 4, status: "occupied" as const },
  { label: "12", seats: 4, status: "free" as const },
];

const statusColor = { free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", occupied: "bg-rose-500/20 text-rose-400 border-rose-500/30", reserved: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
const statusLabel = { free: "Frei", occupied: "Belegt", reserved: "Reserviert" };

export default function FuerRestaurantsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="px-4 pb-24 pt-16 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
                Software für die Gastronomie
              </p>
              <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] tracking-tight">
                Alles für dein Restaurant.
                <br />
                <span className="text-muted-foreground">In einer Lösung.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                Tischplanung, Reservierungen, Bestellungen, Kartenzahlung, Küchenanzeige und KPI-Dashboard – eine Plattform für einzelne Lokale oder ganze Restaurantgruppen.
              </p>
              <div className="mt-8 flex gap-3">
                <Link
                  href="/kontakt"
                  className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90"
                >
                  Erstberatung vereinbaren
                </Link>
                <Link
                  href="/fuer-restaurants/pricing"
                  className="rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-colors hover:bg-accent"
                >
                  Preise
                </Link>
              </div>
            </div>

            {/* Table planner mockup */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0f] p-5 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="uppercase tracking-wider">Tischplan</span>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Frei</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Reserviert</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Belegt</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {tables.map((t) => (
                  <div key={t.label} className={`flex h-16 flex-col items-center justify-center rounded-lg border text-xs font-medium ${statusColor[t.status]}`}>
                    <span className="text-sm font-semibold text-white/80">{t.label}</span>
                    <span className="text-[10px] text-white/40">{t.seats}P · {statusLabel[t.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Funktionen</h2>
          <p className="mt-1 text-sm text-muted-foreground">Was GastroPilot für dein Restaurant tut.</p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="bg-card p-6">
                <f.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/fuer-restaurants/features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Alle Features im Detail →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">So startest du</h2>
          <div className="mt-8 space-y-0">
            {[
              { n: "1", t: "Bestellen", d: "Wähle dein Paket und sichere dir deine GastroPilot-Instanz." },
              { n: "2", t: "Onboarding", d: "Wir richten gemeinsam deine Umgebung ein – Restaurants, Tische, Team." },
              { n: "3", t: "Go-Live", d: "Probelauf vor Ort, dann produktiver Betrieb." },
            ].map((s, i) => (
              <div key={s.n} className="flex gap-5 border-l py-6 pl-6">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">{s.n}</span>
                <div>
                  <p className="text-sm font-semibold">{s.t}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Was Gastronomen sagen</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border p-6">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[12px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Häufige Fragen</h2>
          <div className="mt-8 divide-y">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Bereit?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Informiere dich über unsere Pakete oder vereinbare eine Erstberatung.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/fuer-restaurants/pricing" className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90">
              Preise ansehen
            </Link>
            <Link href="/kontakt" className="rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-colors hover:bg-accent">
              Kontakt
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
