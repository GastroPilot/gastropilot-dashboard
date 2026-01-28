'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

const APP_VERSION_RAW = (process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0-dev').trim();
const APP_VERSION = APP_VERSION_RAW.startsWith('v') ? APP_VERSION_RAW : `v${APP_VERSION_RAW}`;

const AUTH_PATHS = ['/login', '/login-nfc'];

export function SiteFooter() {
  const pathname = usePathname();

  const hideFooter = useMemo(() => {
    if (!pathname) return false;
    return AUTH_PATHS.some((authPath) => pathname.startsWith(authPath));
  }, [pathname]);

  if (hideFooter) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-300">
      <div className="flex items-center gap-2 text-gray-400">
        <span>Version {APP_VERSION}</span>
        <span className="text-gray-600">|</span>
        <span className="font-semibold">Servecta @ {currentYear}</span>
      </div>
    </footer>
  );
}
