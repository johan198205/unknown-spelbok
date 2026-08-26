import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Barlow, IBM_Plex_Mono, Oswald } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import { AuthEventTracker } from "@/components/layout/AuthEventTracker";
import { DisplayPrefsProvider } from "@/components/DisplayPrefsProvider";
import { RouteProgress } from "@/components/ui/RouteProgress";
import { ToastProvider } from "@/components/ui/Toast";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { getGtmContainerId } from "@/lib/tracking-settings";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
});

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  applicationName: "Spelbok",
  title: {
    default: "Spelbok",
    template: "%s · Spelbok",
  },
  description:
    "Bokför varje spel, se din riktiga ROI och jämför dig i topplistan.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spelbok",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1420",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Tomt container-id i /admin/installningar → ingen GTM alls på sidan.
  const gtmId = await getGtmContainerId();
  // Visningsläge, valuta och unit-storlek för hela trädet. Vyer som visar
  // någon annans spelbok lägger en egen provider närmare innehållet.
  const displayPrefs = await getDisplayPrefs();

  return (
    <html
      lang="sv"
      className={`${oswald.variable} ${barlow.variable} ${plex.variable} h-full`}
    >
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      <body className="min-h-full flex flex-col bg-bg text-text antialiased">
        {/* useSearchParams får inte dra hela trädet ur prerendering. */}
        <Suspense fallback={null}>
          <RouteProgress />
          <AuthEventTracker />
        </Suspense>
        <DisplayPrefsProvider value={displayPrefs}>
          <ToastProvider>{children}</ToastProvider>
        </DisplayPrefsProvider>
      </body>
    </html>
  );
}
