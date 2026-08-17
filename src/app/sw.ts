import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  setCacheNameDetails,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

setCacheNameDetails({ prefix: "spelbok", suffix: "v3" });

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/fixtures"),
    method: "GET",
    handler: new NetworkOnly(),
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
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.searchParams.has("_rsc"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      request.mode === "navigate" &&
      !url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
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
  navigationPreload: false,
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

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Spelbok";
  const body = payload.body || "";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath =
    (event.notification.data as { url?: string } | undefined)?.url || "/";

  event.waitUntil(
    (async () => {
      const origin = self.location.origin;
      const targetUrl = new URL(targetPath, origin).href;
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (!client.url.startsWith(origin) || !("focus" in client)) continue;
        const windowClient = client as WindowClient;
        await windowClient.focus();
        await windowClient.navigate(targetUrl);
        return;
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
