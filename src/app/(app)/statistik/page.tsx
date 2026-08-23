import { redirect } from "next/navigation";

/**
 * Statistiken bor på startsidan sedan sammanslagningen. Rutten finns kvar så
 * gamla bokmärken och hemskärms-genvägar inte landar på 404.
 */
export default function StatistikPage() {
  redirect("/hem");
}
