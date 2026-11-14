/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Every wiki page a reader opens is kept for offline reading (newest first, up to 300 pages).
    {
      matcher: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 })],
      }),
    },
    // React Server Component payloads used for client-side navigation.
    {
      matcher: ({ request }) => request.headers.get("RSC") === "1",
      handler: new NetworkFirst({ cacheName: "rsc", networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 300 })] }),
    },
    { matcher: ({ url }) => url.pathname === "/search-index.json", handler: new StaleWhileRevalidate({ cacheName: "search-index" }) },
    { matcher: ({ url }) => url.pathname.startsWith("/fonts/"), handler: new CacheFirst({ cacheName: "fonts", plugins: [new ExpirationPlugin({ maxEntries: 20 })] }) },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      { url: "/offline", matcher: ({ request }) => request.destination === "document" && !new URL(request.url).pathname.startsWith("/en") },
      { url: "/en/offline", matcher: ({ request }) => request.destination === "document" && new URL(request.url).pathname.startsWith("/en") },
    ],
  },
});

serwist.addEventListeners();
