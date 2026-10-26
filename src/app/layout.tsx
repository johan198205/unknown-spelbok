import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import { AuthEventTracker } from "@/components/layout/AuthEventTracker";
import { DisplayPrefsProvider } from "@/components/DisplayPrefsProvider";
import { TextsProvider } from "@/components/TextsProvider";
import { PopupHost } from "@/components/popups/PopupHost";
import { RouteProgress } from "@/components/ui/RouteProgress";
import { ToastProvider } from "@/components/ui/Toast";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { getGtmContainerId } from "@/lib/tracking-settings";
import { getT, getTextOverrides } from "@/lib/texts/server";
import "./globals.css";

// Varumärkets typsnitt (Brand Guidelines): Manrope i alla vikter, för
// rubriker, brödtext och siffror. Siffrorna får tabulära bredder via
// font-variant-numeric där de ska linjera.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return {
    applicationName: t("common.meta.siteName"),
    title: {
      default: t("common.meta.siteName"),
      template: t("common.meta.titleTemplate"),
    },
    description: t("common.meta.description"),
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: t("common.meta.appleTitle"),
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
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  // Krävs för att env(safe-area-inset-*) ska få värden i iOS-PWA:n
  // (statusBarStyle black-translucent lägger sidan under statusfältet).
  viewportFit: "cover",
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
  // Texter som admin skrivit över i /admin/texter. Standardtexterna ligger
  // i koden, så bara överskrivningarna behöver skickas till klienten.
  const textOverrides = await getTextOverrides();

  return (
    <html
      lang="sv"
      className={`${manrope.variable} h-full`}
    >
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      <body className="min-h-full flex flex-col bg-bg text-text antialiased">
        <TextsProvider overrides={textOverrides}>
          {/* useSearchParams får inte dra hela trädet ur prerendering. */}
          <Suspense fallback={null}>
            <RouteProgress />
            <AuthEventTracker />
          </Suspense>
          <DisplayPrefsProvider value={displayPrefs}>
            <ToastProvider>{children}</ToastProvider>
          </DisplayPrefsProvider>
          {/*
            Ligger utanför ToastProvider och sist i trädet: rutan ska rendera
            över allt annat, och den ska aldrig kunna hindra sidan från att
            målas om läsningen är långsam.
          */}
          <Suspense fallback={null}>
            <PopupHost />
          </Suspense>
        </TextsProvider>
      </body>
    </html>
  );
}
