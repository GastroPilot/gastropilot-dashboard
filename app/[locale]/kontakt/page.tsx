"use client";

import { useState } from "react";
import { Mail, PhoneCall, MapPin } from "lucide-react";
import { SALES_EMAIL, SALES_PHONE } from "@/lib/contact";
import { companyData } from "@/lib/company-data";

export default function KontaktPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(form.subject || "Kontaktanfrage")}&body=${encodeURIComponent(`Name: ${form.name}\nE-Mail: ${form.email}\nTelefon: ${form.phone}\n\n${form.message}`)}`;
  };

  const inputClass = "h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";

  return (
    <main className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Kontakt</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Sprechen Sie mit uns</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">Unverbindliche Beratung für Ihr Restaurant oder allgemeine Fragen.</p>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr,280px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Name *" value={form.name} onChange={set("name")} className={inputClass} />
              <input required type="email" placeholder="E-Mail *" value={form.email} onChange={set("email")} className={inputClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="tel" placeholder="Telefon" value={form.phone} onChange={set("phone")} className={inputClass} />
              <input placeholder="Betreff" value={form.subject} onChange={set("subject")} className={inputClass} />
            </div>
            <textarea
              required
              rows={5}
              placeholder="Ihre Nachricht *"
              value={form.message}
              onChange={set("message")}
              className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground"
            />
            <button type="submit" className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:bg-foreground/90">
              Nachricht senden
            </button>
          </form>

          <div className="space-y-4 text-[13px]">
            <div className="rounded-lg border p-5">
              <p className="mb-3 text-sm font-medium">Direkt erreichen</p>
              <div className="space-y-3 text-muted-foreground">
                <a href={`mailto:${SALES_EMAIL}`} className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" />{SALES_EMAIL}
                </a>
                <a href={`tel:${SALES_PHONE.replace(/\s+/g, "")}`} className="flex items-center gap-2 hover:text-foreground">
                  <PhoneCall className="h-3.5 w-3.5" />{SALES_PHONE}
                </a>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{companyData.companyName}<br />{companyData.address.street}<br />{companyData.address.postalCode} {companyData.address.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
