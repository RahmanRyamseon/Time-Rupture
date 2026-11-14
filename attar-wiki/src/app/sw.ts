/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Every wiki page a reader opens is kept for offline reading (network first,
// so online readers always get the latest revision).
const wikiCaching: RuntimeCaching[] = [
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/api/") && !url.pathname.includes("/moderate"),
    handler: new NetworkFirst({
      cacheName: "wiki-pages",
      networkTimeoutSeconds: 4,
      plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: THIRTY_DAYS, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/v1/") && !url.pathname.startsWith("/api/v1/matcher"),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: "wiki-api",
      networkTimeoutSeconds: 4,
      plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: THIRTY_DAYS })],
    }),
  },
  {
    matcher: ({ url }) => url.pathname.includes("/storage/v1/object/public/"),
    handler: new StaleWhileRevalidate({
      cacheName: "wiki-images",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: THIRTY_DAYS })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...wikiCaching, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
