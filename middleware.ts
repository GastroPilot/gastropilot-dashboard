import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - api, _next, static files, favicon, icons, manifest
    "/((?!api|_next|.*\\..*|favicon\\.ico|icons|manifest\\.json).*)",
  ],
};
