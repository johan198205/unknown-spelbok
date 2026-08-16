import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const TEN_MINUTES = 10 * 60;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/fixtures"),
    method: "GET",
    handler: new StaleWhileRevalidate({
      cacheName: "api-fixtures",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: TEN_MINUTES,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin &&
      (url.pathname.startsWith("/icons/") ||
        url.pathname === "/manifest.json" ||
        url.pathname === "/favicon.ico"),
    handler: new CacheFirst({
      cacheName: "static-icons",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 * 365,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: /\/_next\/static.+/i,
    handler: new CacheFirst({
      cacheName: "next-static-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 60 * 60 * 24 * 30,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      request.mode === "navigate" &&
      !url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "pages-network-first",
      networkTimeoutSeconds: 8,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 60 * 60 * 24,
        }),
      ],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
