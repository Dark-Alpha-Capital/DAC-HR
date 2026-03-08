# @workspace/redis

Shared Redis utilities for this monorepo.

## Exports

- `getRedisUrl()`: resolves the runtime Redis URL.
- `getRedis()`: returns a singleton Redis client for app runtime usage.
- `createRedisForBullMQ()`: returns a dedicated Redis client configured for BullMQ.
- `resetRedisForTests()`: closes and resets the singleton client for test teardown.

## Environment

- `REDIS_URL`: required in production runtime.
- In local development/test runtime, default host resolves to `localhost:6379`.

## Usage

```ts
import { getRedis, createRedisForBullMQ } from "@workspace/redis";

const redis = getRedis();
const workerRedis = createRedisForBullMQ();
```
