"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Plus, Minus, Mail, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { SALES_EMAIL, SALES_PHONE } from "@/lib/contact";
import { packages, hardwareRentals, type BasePackage, type PricingItem } from "@/lib/pricing";

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function PricingPage() {
  const [selected, setSelected] = useState<BasePackage>(
    packages.find((p) => p.highlighted) || packages[0]
  );
  const [hw, setHw] = useState<Record<string, number>>(() =>
    Object.fromEntries(hardwareRentals.map((i) => [i.id, 0]))
  );

  const { oneTime, monthly } = useMemo(() => {
    let o = selected.setupFee;
    let m = 0;
    if (selected.priceInterval === "one-time") o += selected.basePrice;
    else m += selected.basePrice;
    hardwareRentals.forEach((i) => (m += (hw[i.id] || 0) * i.price));
    return { oneTime: o, monthly: m };
  }, [selected, hw]);

  return (
    <main>
      {/* Hero */}
      <section className="px-4 pb-12 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">Preise</p>
          <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] tracking-tight">
            Transparente Pakete.
            <br />
            <span className="text-muted-foreground">Keine versteckten Kosten.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Jedes Paket enthält Hosting, Wartung, Updates und DSGVO-konformes EU-Hosting.
          </p>
        </div>
      </section>

      {/* Package cards */}
      <section className="border-t px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.map((pkg) => (
              <button
                key={pkg.key}
                type="button"
                onClick={() => setSelected(pkg)}
                className={cn(
                  "rounded-2xl border p-5 text-left transition-all",
                  selected.key === pkg.key
                    ? "border-foreground ring-1 ring-foreground"
                    : "hover:border-foreground/20"
                )}
              >
                {pkg.badge && (
                  <span className={cn(
                    "mb-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                    pkg.highlighted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {pkg.badge}
                  </span>
                )}
                <h3 className="text-sm font-semibold">{pkg.name}</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{pkg.tagline}</p>
                <p className="mt-3 text-2xl font-bold tabular-nums">{fmt(pkg.basePrice)}</p>
                <p className="text-[12px] text-muted-foreground">/Monat + {fmt(pkg.setupFee)} einmalig</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-t px-4 py-16">
        <div className="mx-auto max-w-5xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-background py-3 pr-4 text-left font-medium text-muted-foreground"></th>
                {packages.map((p) => (
                  <th key={p.key} className={cn("min-w-[120px] py-3 text-center font-medium", selected.key === p.key && "text-foreground", selected.key !== p.key && "text-muted-foreground")}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px]">
              <SectionHeader label="Module" />
              <Row label="Reservierungen" pkgs={packages} val={(p) => p.includedModules.includes("reservierungen")} />
              <Row label="Bestellungen/Menue" pkgs={packages} val={(p) => p.includedModules.includes("bestellungen")} />
              <Row label="Web-Reservierung" pkgs={packages} val={(p) => p.includedModules.includes("web-reservierung")} />
              <Row label="WhatsApp-Bot" pkgs={packages} val={(p) => p.includedModules.includes("whatsapp-reservierung")} />
              <Row label="Telefon-Bot" pkgs={packages} val={(p) => p.includedModules.includes("telefon-reservierung")} />
              <SectionHeader label="Inklusive" />
              <Row label="Hosting & Wartung" pkgs={packages} val={() => true} />
              <Row label="DSGVO-EU-Hosting" pkgs={packages} val={() => true} />
              <Row label="Projektmanager" pkgs={packages} val={(p) => ["professional", "business", "premium"].includes(p.key)} />
              <Row label="Erweiterte Analytics" pkgs={packages} val={(p) => ["business", "premium"].includes(p.key)} />
              <Row label="Multi-Location" pkgs={packages} val={(p) => p.key === "premium"} />
              <SectionHeader label="Support" />
              <TextRow label="Level" pkgs={packages} val={(p) => p.support} />
            </tbody>
          </table>
        </div>
      </section>

      {/* Hardware */}
      <section className="border-t px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold tracking-tight">Tablet-Miete</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vorkonfiguriert, sofort einsatzbereit.</p>
          <div className="mt-6 space-y-3">
            {hardwareRentals.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[13px] text-muted-foreground">{fmt(item.price)} {item.priceNote}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHw((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}
                    disabled={(hw[item.id] || 0) === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{hw[item.id] || 0}</span>
                  <button
                    type="button"
                    onClick={() => setHw((p) => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="border-t px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
            {selected.name}-Paket
          </p>
          {oneTime > 0 && (
            <p className="mt-3">
              <span className="text-3xl font-bold tabular-nums">{fmt(oneTime)}</span>
              <span className="ml-1 text-sm text-muted-foreground">einmalig</span>
            </p>
          )}
          {monthly > 0 && (
            <p className="mt-1">
              <span className="text-3xl font-bold tabular-nums">{fmt(monthly)}</span>
              <span className="ml-1 text-sm text-muted-foreground">/Monat</span>
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={`/kontakt?package=${selected.key}`}
              className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:bg-foreground/90"
            >
              Angebot anfragen
            </Link>
            <Link href="/kontakt" className="rounded-full border px-5 py-2.5 text-[14px] font-semibold hover:bg-accent">
              Kontakt
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t px-4 py-12">
        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-6 text-[13px] text-muted-foreground">
          <a href={`mailto:${SALES_EMAIL}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Mail className="h-3.5 w-3.5" />{SALES_EMAIL}
          </a>
          <a href={`tel:${SALES_PHONE.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 hover:text-foreground">
            <PhoneCall className="h-3.5 w-3.5" />{SALES_PHONE}
          </a>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={6} className="pb-1 pt-5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{label}</td>
    </tr>
  );
}

function Row({ label, pkgs, val }: { label: string; pkgs: BasePackage[]; val: (p: BasePackage) => boolean }) {
  return (
    <tr className="border-b border-border/50">
      <td className="sticky left-0 z-10 bg-background py-2.5 pr-4 text-[13px]">{label}</td>
      {pkgs.map((p) => (
        <td key={p.key} className="py-2.5 text-center">
          {val(p) ? <span className="text-foreground">&#10003;</span> : <span className="text-muted-foreground/30">—</span>}
        </td>
      ))}
    </tr>
  );
}

function TextRow({ label, pkgs, val }: { label: string; pkgs: BasePackage[]; val: (p: BasePackage) => string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="sticky left-0 z-10 bg-background py-2.5 pr-4 text-[13px]">{label}</td>
      {pkgs.map((p) => (
        <td key={p.key} className="py-2.5 text-center text-[12px] text-muted-foreground">{val(p)}</td>
      ))}
    </tr>
  );
}
