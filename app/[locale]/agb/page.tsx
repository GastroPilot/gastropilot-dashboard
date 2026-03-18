import type { Metadata } from "next";
import { companyData } from "@/lib/company-data";

export const metadata: Metadata = {
  title: "AGB",
};

export default function AGBPage() {
  return (
    <main className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">
          Allgemeine Geschäftsbedingungen
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              § 1 Geltungsbereich
            </h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle
              Verträge, die zwischen {companyData.companyName} und dem Kunden
              über die Plattform GastroPilot geschlossen werden.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              § 2 Vertragsgegenstand
            </h2>
            <p>
              GastroPilot stellt eine Plattform zur Verfügung, über die Gäste
              Restaurants entdecken, nach Allergenen filtern und online
              reservieren können. Für Restaurantbetreiber bietet GastroPilot
              eine Software zur Verwaltung von Reservierungen, Bestellungen und
              Tischplänen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              § 3 Nutzung der Plattform
            </h2>
            <p>
              Die Nutzung der Plattform als Gast ist kostenlos. Für
              Restaurantbetreiber gelten die jeweiligen Paketpreise gemäß der
              aktuellen Preisliste.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              § 4 Datenschutz
            </h2>
            <p>
              Informationen zur Verarbeitung personenbezogener Daten finden Sie
              in unserer Datenschutzerklärung.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              § 5 Schlussbestimmungen
            </h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland.
              Gerichtsstand ist {companyData.address.city}, sofern der Kunde
              Kaufmann ist.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
