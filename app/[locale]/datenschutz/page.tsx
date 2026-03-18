import type { Metadata } from "next";
import { companyData } from "@/lib/company-data";

export const metadata: Metadata = {
  title: "Datenschutz",
};

export default function DatenschutzPage() {
  return (
    <main className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Datenschutzerklärung</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Datenschutz auf einen Blick
            </h2>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber,
              was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
              Website besuchen. Personenbezogene Daten sind alle Daten, mit
              denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Verantwortliche Stelle
            </h2>
            <p>
              {companyData.companyName}
              <br />
              {companyData.address.street}
              <br />
              {companyData.address.postalCode} {companyData.address.city}
              <br />
              E-Mail: {companyData.contact.email}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Datenerfassung auf dieser Website
            </h2>
            <p>
              Wenn Sie diese Website benutzen, werden verschiedene
              personenbezogene Daten erhoben. Die vorliegende
              Datenschutzerklärung erläutert, welche Daten wir erheben und
              wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem
              Zweck das geschieht.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Hosting
            </h2>
            <p>
              Diese Website wird auf Servern in der Europäischen Union
              gehostet. Alle Daten werden ausschliesslich innerhalb der EU
              verarbeitet und gespeichert – DSGVO-konform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Ihre Rechte
            </h2>
            <p>
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über
              Herkunft, Empfänger und Zweck Ihrer gespeicherten
              personenbezogenen Daten zu erhalten. Sie haben ausserdem ein Recht,
              die Berichtigung oder Löschung dieser Daten zu verlangen.
              Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie
              sich jederzeit an uns wenden.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
