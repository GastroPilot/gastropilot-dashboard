/**
 * Zentrale Verwaltung aller Firmen- und Kontaktdaten
 * Diese Datei sollte als einzige Quelle für alle rechtlich relevanten Firmeninformationen dienen.
 */

export const companyData = {
  // Firmenname
  companyName: "Servecta UG (haftungsbeschränkt) i.G.",
  
  // Adresse
  address: {
    street: "Musterstraße 1",
    postalCode: "12345",
    city: "Musterstadt",
    country: "Deutschland",
  },
  
  // Vollständige Adresse als String (für einfache Verwendung)
  get fullAddress(): string {
    return `${this.address.street}\n${this.address.postalCode} ${this.address.city}\n${this.address.country}`;
  },
  
  // Kontakt
  contact: {
    email: "support@gastropilot.org",
  },
  
  // Geschäftsführung
  management: "Sascha Dolgow, Luca Stephan Kohls",
  
  // Registereintrag
  register: {
    court: "Amtsgericht [Ort]",
    number: "HRB [Nummer]",
  },
  
  // Umsatzsteuer-ID
  vatId: "DE123456789",
  
  // Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
  contentResponsible: {
    name: "Luca Stephan Kohls",
    address: {
      street: "Musterstraße 1",
      postalCode: "12345",
      city: "Musterstadt",
      country: "Deutschland",
    },
    get fullAddress(): string {
      return `${this.address.street}\n${this.address.postalCode} ${this.address.city}\n${this.address.country}`;
    },
  },
} as const;

