import type { Metadata } from "next";
import "./globals.css";
import { SnowfallToggle } from "@/components/snowfall-toggle";
import { SiteFooter } from "@/components/site-footer";
import { QueryProvider } from "@/lib/providers/query-provider";

export const metadata: Metadata = {
  title: "Reservierungsmanagement",
  description: "Verwaltung von Tischen und Reservierungen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        <QueryProvider>
          <SnowfallToggle />
          <div className="flex-1 flex flex-col">{children}</div>
          <SiteFooter />
        </QueryProvider>
      </body>
    </html>
  );
}
