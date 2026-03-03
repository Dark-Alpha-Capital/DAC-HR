import IORedis, { type RedisOptions } from "ioredis";

export type RedisClient = IORedis;
export type { RedisOptions };

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: RedisClient | undefined;
}

const DEFAULT_REDIS_URL = "redis://localhost:6379";

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? DEFAULT_REDIS_URL;
}

function createRedisClient(
  url: string = getRedisUrl(),
  options?: RedisOptions,
): RedisClient {
  if (!url) {
    throw new Error("REDIS_URL is not set and no URL was provided to createRedisClient.");
  }

  const client = new IORedis(url, {
    maxRetriesPerRequest: 3,
    ...options,
  });

  client.on("error", (err) => {
    // Keep this lightweight; consumers can attach their own listeners if needed.
    console.error("[redis] client error", err);
  });

  return client;
}

/**
 * Returns a singleton Redis client. Safe to use in server-side
 * code (Node/Next.js). Avoid using this in browser/client code.
 */
export function getRedis(): RedisClient {
  if (typeof globalThis === "undefined") {
    throw new Error("getRedis() can only be used in a Node.js-like environment.");
  }

  if (!globalThis.__redisClient) {
    globalThis.__redisClient = createRedisClient();
  }

  return globalThis.__redisClient;
}

/**
 * Creates a new Redis client instance intended for BullMQ usage.
 * BullMQ typically prefers its own dedicated connection.
 */
export function createRedisForBullMQ(
  url: string = getRedisUrl(),
  options?: RedisOptions,
): RedisClient {
  return createRedisClient(url, options);
}
