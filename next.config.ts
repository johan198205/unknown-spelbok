import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

function supabaseStorageHostname() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseStorageHostname();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: false,
  reloadOnOnline: true,
  additionalPrecacheEntries: [
    { url: "/offline", revision },
    { url: "/manifest.json", revision },
    { url: "/icons/icon-192.png", revision },
    { url: "/icons/badge-72.png", revision },
    { url: "/icons/icon-512.png", revision },
    { url: "/icons/icon-512-maskable.png", revision },
    { url: "/icons/apple-touch-icon.png", revision },
  ],
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["web-push"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default withSerwist(nextConfig);
