import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, the service worker and static files.
  matcher: ["/((?!api|_next|_vercel|sw.js|swe-worker|manifest.webmanifest|search-index.json|fonts|icons|.*\\..*).*)"],
};
