import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="text-[15px] font-bold tracking-tight">
              GastroPilot
            </Link>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Restaurants entdecken, nach Allergenen filtern und online reservieren.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-10 text-[14px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground/60">Gäste</p>
              <ul className="mt-4 space-y-2.5 text-muted-foreground">
                <li><Link href="/restaurants" className="transition-colors hover:text-foreground">Restaurants</Link></li>
                <li><Link href="/auth/register" className="transition-colors hover:text-foreground">Registrieren</Link></li>
                <li><Link href="/auth/login" className="transition-colors hover:text-foreground">Anmelden</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground/60">Restaurants</p>
              <ul className="mt-4 space-y-2.5 text-muted-foreground">
                <li><Link href="/fuer-restaurants" className="transition-colors hover:text-foreground">Übersicht</Link></li>
                <li><Link href="/fuer-restaurants/features" className="transition-colors hover:text-foreground">Features</Link></li>
                <li><Link href="/fuer-restaurants/pricing" className="transition-colors hover:text-foreground">Preise</Link></li>
                <li><Link href="/kontakt" className="transition-colors hover:text-foreground">Kontakt</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground/60">Rechtliches</p>
              <ul className="mt-4 space-y-2.5 text-muted-foreground">
                <li><Link href="/datenschutz" className="transition-colors hover:text-foreground">Datenschutz</Link></li>
                <li><Link href="/impressum" className="transition-colors hover:text-foreground">Impressum</Link></li>
                <li><Link href="/agb" className="transition-colors hover:text-foreground">AGB</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-[13px] text-muted-foreground/50">
          &copy; {new Date().getFullYear()} GastroPilot
        </div>
      </div>
    </footer>
  );
}
