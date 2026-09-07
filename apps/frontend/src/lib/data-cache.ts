// Server-only read-through cache for D1-backed data. This module is only ever
// imported from `features/*/server/*` service files, so it never reaches the
// client bundle.
//
// It is an in-isolate LRU: each Cloudflare isolate serves many requests, so
// repeat reads within the TTL window (dashboard loads, template/option lookups
// across navigations) are absorbed with zero configuration and no staleness
// beyond the chosen TTL. Write paths that mutate a cached domain call
// `purgeCache(scope)` to evict entries immediately.

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const isolateStore = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const ISOLATE_CACHE_MAX = 300;

export async function cached<T>(
  scope: string,
  key: string,
  load: () => Promise<T>,
  options: { ttlMs?: number } = {},
): Promise<T> {
  const cacheKey = `${scope}:${key}`;
  const ttlMs = options.ttlMs ?? 30_000;
  const now = Date.now();

  const entry = isolateStore.get(cacheKey);
  if (entry && entry.expiresAt > now) {
    // SAFETY: the stored value was produced by this function's own `load()`
    // for this exact key and is still inside its TTL window, so it satisfies
    // the generic call-site type `T`.
    return entry.value as T;
  }

  const pending = inflight.get(cacheKey);
  if (pending) {
    // SAFETY: same-key in-flight loads share the identical `load()` result.
    return pending as Promise<T>;
  }

  const run = (async () => {
    try {
      const value = await load();
      const expiresAt = Date.now() + ttlMs;

      if (isolateStore.size >= ISOLATE_CACHE_MAX) {
        const oldest = isolateStore.keys().next().value;
        if (oldest !== undefined) {
          isolateStore.delete(oldest);
        }
      }
      isolateStore.set(cacheKey, { value, expiresAt });

      return value;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, run);
  return run;
}

/**
 * Evicts every entry whose scope prefix matches. Call this from write paths
 * that mutate the domain a cached read describes (e.g. after an application
 * status change) so the next read is fresh instead of serving a stale TTL.
 */
export function purgeCache(scope: string): void {
  const prefix = `${scope}:`;
  for (const key of isolateStore.keys()) {
    if (key.startsWith(prefix)) {
      isolateStore.delete(key);
    }
  }
}
