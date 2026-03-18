import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InstallPrompt } from "@/components/install-prompt";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: {
    default: "GastroPilot – Restaurants entdecken & reservieren",
    template: "%s | GastroPilot",
  },
  description:
    "Finden Sie das perfekte Restaurant, filtern Sie nach Allergenen und reservieren Sie online.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://gastropilot.de"
  ),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GastroPilot",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={manrope.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#E75E29" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
