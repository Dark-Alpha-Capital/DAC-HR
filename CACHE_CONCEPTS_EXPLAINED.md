# Understanding cacheLife: stale, revalidate, and expire

## Overview

These three properties control different aspects of caching behavior:

1. **`stale`** - Client-side cache behavior (browser/router)
2. **`revalidate`** - Server-side background refresh timing
3. **`expire`** - Maximum age before forced regeneration

---

## 1. `stale` - Client-Side Cache Time

**What it does:** Controls how long the Next.js client router can serve cached data **without checking the server**.

**When it matters:** When users navigate between pages using client-side navigation (clicking links, using browser back/forward).

**Example Scenario:**

```tsx
cacheLife({
  stale: 300, // 5 minutes
  revalidate: 3600,
  expire: 21600,
});
```

### Timeline Example:

**Time 0:00** - User visits `/employees`

- ✅ Server fetches fresh data from database
- ✅ Caches the result
- ✅ User sees employee list

**Time 0:01** - User navigates to `/candidates`, then back to `/employees` (within 5 minutes)

- ✅ **Client cache hit!** No server request
- ✅ Page loads instantly from browser cache
- ⚠️ Data might be 1 minute old, but that's acceptable

**Time 0:06** - User navigates back to `/employees` (after 5 minutes)

- ⚠️ Stale time expired
- ✅ Client makes request to server
- ✅ Server checks its cache and serves (if cache is still valid on server)

**Time 1:00** - User navigates back to `/employees` (after 1 hour)

- ⚠️ Stale time expired
- ✅ Client requests from server
- ✅ Server cache is still valid (within revalidate time)
- ✅ Server serves cached response immediately
- 🔄 Server starts background refresh for next time

**Key Point:** `stale` only affects **client-side navigation**. Full page reloads always check the server.

---

## 2. `revalidate` - Server Background Refresh Time

**What it does:** How often the server should regenerate cached content in the **background**.

**When it matters:** When serving cached responses to requests, even if the cache is technically "stale".

**Example Scenario:**

```tsx
cacheLife({
  stale: 300,
  revalidate: 3600, // 1 hour
  expire: 21600,
});
```

### Timeline Example:

**Time 0:00** - First request to `/employees`

- ✅ Server fetches from database
- ✅ Stores in cache with timestamp
- ✅ Serves to user

**Time 0:30** - User requests `/employees` again

- ✅ Server cache is 30 minutes old (< 1 hour)
- ✅ Server serves cached version immediately
- ✅ No database query needed
- ✅ Fast response time

**Time 1:15** - User requests `/employees` again

- ⚠️ Cache is 1 hour 15 minutes old (> 1 hour revalidate)
- ✅ **Server serves stale cache immediately** (user gets instant response)
- 🔄 **Server starts background refresh** (fetches fresh data from DB)
- ✅ Next request will get the fresh data

**Time 1:20** - Another user requests `/employees`

- ✅ Fresh data is ready (from background refresh at 1:15)
- ✅ Server serves fresh data immediately
- ✅ No waiting

**Key Point:** `revalidate` enables **stale-while-revalidate** pattern - users get instant responses while fresh data loads in the background.

---

## 3. `expire` - Maximum Cache Age

**What it does:** Hard limit on how old cached data can be. After this time, the server **must** regenerate content synchronously (user waits).

**When it matters:** Safety net for scenarios where the cache wasn't refreshed (low traffic, server restarts, etc.).

**Example Scenario:**

```tsx
cacheLife({
  stale: 300,
  revalidate: 3600,
  expire: 21600, // 6 hours
});
```

### Timeline Example:

**Time 0:00** - First request

- ✅ Server fetches data, caches it

**Time 1:00** - Request arrives

- ✅ Cache is 1 hour old (< revalidate time)
- ✅ Server serves cached version
- 🔄 Background refresh starts

**Time 3:00** - Request arrives (no traffic for 2 hours)

- ⚠️ Cache is 3 hours old (> revalidate, but < expire)
- ✅ Server serves stale cache immediately
- 🔄 Background refresh starts

**Time 7:00** - Request arrives (no traffic for 4 hours)

- ⚠️ Cache is 7 hours old (> expire time of 6 hours)
- ❌ **Server CANNOT serve expired cache**
- ⏳ **User must wait** while server fetches fresh data
- ✅ Fresh data fetched and cached
- ✅ User gets response (slower than cached, but fresh)

**Key Point:** `expire` is a safety net. If your app has regular traffic, you'll rarely hit this because `revalidate` keeps refreshing.

---

## Complete Example: All Three Working Together

Let's trace through a real scenario with:

```tsx
cacheLife({
  stale: 300, // 5 minutes
  revalidate: 3600, // 1 hour
  expire: 21600, // 6 hours
});
```

### Scenario: Employee list page with various user requests

**Monday 9:00 AM** - Alice visits `/employees`

- ✅ Server: Cache miss, fetches from DB (takes 200ms)
- ✅ Server: Caches result with timestamp `9:00 AM`
- ✅ Client: Receives data, stores in client cache
- ✅ Alice sees employee list

**Monday 9:02 AM** - Alice navigates away, then back

- ✅ Client: Cache hit (2 min < 5 min stale)
- ✅ Instant page load (0ms)
- ✅ No server request

**Monday 9:06 AM** - Bob visits `/employees`

- ✅ Client: Stale time expired (6 min > 5 min)
- ✅ Client: Requests from server
- ✅ Server: Cache valid (6 min < 1 hour revalidate)
- ✅ Server: Serves cached version (50ms)
- ✅ Bob sees employee list (slightly stale but fast)

**Monday 10:15 AM** - Charlie visits `/employees`

- ✅ Client: Requests from server (stale expired)
- ⚠️ Server: Cache is 1 hour 15 min old (> revalidate)
- ✅ Server: **Serves stale cache immediately** (50ms)
- 🔄 Server: **Starts background refresh** (fetching fresh data)
- ✅ Charlie sees employee list instantly (slightly stale)

**Monday 10:16 AM** - Dana visits `/employees`

- ✅ Client: Requests from server
- ✅ Server: Fresh data ready (from background refresh at 10:15)
- ✅ Server: Serves fresh data (50ms)
- ✅ Dana sees up-to-date employee list

**Monday 3:00 PM** - Employee data updated via `updateTag("employees")`

- ✅ Cache invalidated immediately
- ✅ Next request will fetch fresh data

**Monday 4:00 PM** - Eve visits `/employees` (after tag invalidation)

- ✅ Server: Cache was invalidated, so cache miss
- ✅ Server: Fetches fresh data from DB (200ms)
- ✅ Server: Caches new result

**Tuesday 3:00 AM** - Server restarts, cache cleared (hypothetical)

- ❌ All caches lost

**Tuesday 8:00 AM** - Frank visits `/employees` (first request after restart)

- ✅ Server: Cache miss (was cleared)
- ✅ Server: Fetches fresh data (200ms)
- ✅ Server: Caches result

**Tuesday 4:00 PM** - Grace visits `/employees` (last request was 8 AM, 8 hours ago)

- ⚠️ Cache is 8 hours old (> expire time of 6 hours)
- ❌ Server: **Cannot serve expired cache**
- ⏳ Server: **Must fetch fresh data synchronously** (user waits 200ms)
- ✅ Fresh data cached
- ✅ Grace sees employee list

---

## Visual Timeline

```
Time:     0:00    0:05    0:30    1:00    1:15    2:00    7:00
         ────────┼───────┼───────┼───────┼───────┼───────┼────────
stale:    [====]  │                              │              │
                  │                              │              │
revalidate:       [============================] │              │
                                                    │              │
expire:           [===========================================================]
                                                                   │
                                                                   └─ Must wait
```

**Legend:**

- **`[====]`** - Cache can be served instantly
- **`[-----]`** - Cache can be served but triggers background refresh
- **`└─ Must wait`** - Cache expired, user must wait for fresh data

---

## Real-World Analogies

### `stale` - Like a local newspaper

- You can read yesterday's newspaper instantly (in your house)
- After 5 minutes, you might want to check if there's a new edition
- But you can still read the old one without checking

### `revalidate` - Like a news website

- The site shows you cached content immediately (fast load)
- Behind the scenes, it fetches the latest news
- Next visitor gets the fresh news
- You got instant response, they get fresh data

### `expire` - Like food expiration date

- Food is good for a while (revalidate period)
- Even after "best by" date, it might still be okay (stale cache served)
- But after expiration date, you must throw it away (expire - must fetch fresh)

---

## How These Interact with `updateTag`

**Important:** When you call `updateTag("employees")`, it **immediately invalidates** the cache, regardless of `stale`, `revalidate`, or `expire` times.

### Example:

```tsx
// Cache configured with long times
cacheLife({
  stale: 300,
  revalidate: 86400, // 1 day
  expire: 604800, // 1 week
});
```

**Normal scenario:**

- Cache serves for 1 day before background refresh
- Expires after 1 week

**When employee is created:**

```ts
updateTag("employees"); // Called in create-employee.ts
```

- ✅ Cache invalidated **immediately**
- ✅ Next request fetches fresh data
- ✅ No waiting for revalidate or expire times

**Takeaway:** `updateTag` is your primary freshness mechanism. `cacheLife` settings optimize for performance when data hasn't changed.

---

## Practical Implications for Your Employees Page

### Scenario 1: High Traffic (many users viewing employees)

- `stale` (5 min): Users navigating back/forth see instant pages
- `revalidate` (1 hour): Background refreshes keep data fresh
- `expire` (6 hours): Rarely hit because of regular traffic + revalidation

### Scenario 2: Low Traffic (few users)

- `stale` (5 min): Still works for same user's navigation
- `revalidate` (1 hour): Only matters if requests come within hour
- `expire` (6 hours): **Important safety net** - ensures data never older than 6 hours

### Scenario 3: Data Update (employee created/updated)

- `updateTag` called: All timing rules bypassed
- Fresh data fetched immediately
- New cache entry created with fresh timestamp

---

## Choosing Values: Rule of Thumb

### `stale`: Keep short (5-10 minutes)

- **Why:** Ensures fast client navigation
- **Trade-off:** Slightly stale data is acceptable for instant UX
- **Recommendation:** 300 seconds (5 minutes) is good default

### `revalidate`: Match your update frequency

- **If updates hourly:** 3600 seconds (1 hour)
- **If updates daily:** 86400 seconds (1 day)
- **If updates rarely:** Longer (but expire should be reasonable)
- **Recommendation:** 1 hour for employees (they can change during workday)

### `expire`: Safety margin (2-4x revalidate)

- **Why:** Protects against edge cases (low traffic, server issues)
- **If revalidate = 1 hour:** expire = 4-6 hours
- **If revalidate = 1 day:** expire = 3-7 days
- **Recommendation:** 6 hours if revalidate = 1 hour

---

## Common Patterns

### Pattern 1: Real-time data (stock prices)

```tsx
cacheLife({
  stale: 30, // 30 seconds - users expect fresh data
  revalidate: 60, // 1 minute - refresh frequently
  expire: 300, // 5 minutes - short max age
});
```

### Pattern 2: Frequently updated (social feed)

```tsx
cacheLife({
  stale: 300, // 5 minutes - fast navigation OK
  revalidate: 600, // 10 minutes - check for updates
  expire: 3600, // 1 hour - reasonable max age
});
```

### Pattern 3: Your employees (infrequent updates)

```tsx
cacheLife({
  stale: 300, // 5 minutes - instant navigation
  revalidate: 3600, // 1 hour - reasonable refresh
  expire: 21600, // 6 hours - safety margin
});
```

### Pattern 4: Rarely changing (positions list)

```tsx
cacheLife({
  stale: 300, // 5 minutes
  revalidate: 86400, // 1 day - positions rarely change
  expire: 604800, // 1 week - long safety margin
});
```

---

## Summary Table

| Property         | Controls       | User Experience                     | Typical Value   |
| ---------------- | -------------- | ----------------------------------- | --------------- |
| **`stale`**      | Client cache   | Instant navigation between pages    | 300s (5 min)    |
| **`revalidate`** | Server refresh | Fast responses + background updates | 1 hour - 1 day  |
| **`expire`**     | Maximum age    | Prevents extremely stale data       | 2-4x revalidate |

**Remember:** `updateTag` bypasses all of these and forces immediate refresh! 🎯
