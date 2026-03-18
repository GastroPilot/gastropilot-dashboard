import type { Metadata } from "next";
import { companyData } from "@/lib/company-data";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <main className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Impressum</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Angaben gemäß § 5 TMG
            </h2>
            <p>
              {companyData.companyName}
              <br />
              {companyData.address.street}
              <br />
              {companyData.address.postalCode} {companyData.address.city}
              <br />
              {companyData.address.country}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Vertreten durch
            </h2>
            <p>Geschäftsführer: {companyData.management}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Kontakt</h2>
            <p>E-Mail: {companyData.contact.email}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Registereintrag
            </h2>
            <p>
              Registergericht: {companyData.register.court}
              <br />
              Registernummer: {companyData.register.number}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Umsatzsteuer-ID
            </h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a
              Umsatzsteuergesetz: {companyData.vatId}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <p>
              {companyData.contentResponsible.name}
              <br />
              {companyData.contentResponsible.address.street}
              <br />
              {companyData.contentResponsible.address.postalCode}{" "}
              {companyData.contentResponsible.address.city}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
