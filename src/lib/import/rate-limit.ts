/**
 * Minnesbaserad rate limit per användare. Räknaren lever i den serverless-
 * instans som råkar ta anropet — det räcker för att bromsa en användare som
 * spammar preview, men är inte ett säkerhetsskydd. Auth och RLS är det.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);

  // Städa bort nycklar som legat tysta längre än fönstret.
  if (hits.size > 500) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < windowMs)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfter: 0 };
}
