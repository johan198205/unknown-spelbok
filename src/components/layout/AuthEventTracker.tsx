"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * OAuth-inlogg går via en helsidesredirect, så track() hinner aldrig köra på
 * inloggningssidan. /auth/callback lägger istället på ?auth= på landningssidan
 * och den här komponenten skickar eventet och plockar bort parametern igen.
 */
export function AuthEventTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    // Strict mode kör effekten två gånger — annars dubbelrapporteras eventet.
    if (sent.current === auth) return;
    sent.current = auth;

    if (auth === "signup_google") {
      track({ event: "sign_up", method: "google" });
    } else if (auth === "login_google") {
      track({ event: "login", method: "google" });
    } else {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [auth, pathname, router, searchParams]);

  return null;
}
