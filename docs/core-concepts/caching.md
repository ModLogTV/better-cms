# Caching

- [Overview](#overview)
- [Client-side in-memory cache](#client-side-in-memory-cache)
  - [Manual invalidation](#manual-invalidation)
- [Request deduplication](#request-deduplication)
- [SSR pre-seeding (zero-roundtrip initial load)](#ssr-pre-seeding-zero-roundtrip-initial-load)
- [Background polling](#background-polling)
- [Edge / CDN caching](#edge-cdn-caching)
- [Cache interaction between tiers](#cache-interaction-between-tiers)

## Overview

better-cms uses an **eventually consistent** caching model. The goal is to minimize database load and network latency without requiring an external cache (Redis, etc.).

## Client-side in-memory cache

Every call to `loadTranslations` or `loadPageContent` checks a module-level `Map` first.

```
Cache key format:
  translations → "translations:{namespace}:{locale}"
  pages        → "pages:{slug}:{locale}"

TTL: 60 seconds
```

After a successful API response, the result is stored with a 60-second TTL. The next call for the same key within 60 seconds returns the cached value without any network request.

### Manual invalidation

```ts
import { deleteCached } from "@modlog/better-cms/client";

deleteCached("translations:common:en");
```

You can also read and write the cache directly:

```ts
import { getCached, setCached } from "@modlog/better-cms/client";

const cached = getCached<Record<string, string>>("translations:common:en");
setCached("translations:common:en", data, 60_000);
```

## Request deduplication

If multiple concurrent requests (during SSR) call `loadTranslations({ namespace: "common", locale: "en" })` before the first response arrives, only **one** HTTP request is sent. All callers share the same in-flight Promise.

This prevents the "waterfall" problem where 10 server components each trigger a separate network request for the same namespace.

## SSR pre-seeding (zero-roundtrip initial load)

Pass pre-fetched data to `CMSProvider` to avoid any client-side fetch on first render:

```tsx
// Server Component (Next.js page or layout)
import { loadTranslations } from "@modlog/better-cms/client";
import { commonNamespace } from "@repo/cms-config";

export default async function Layout({ children }) {
  const common = await loadTranslations({ namespace: commonNamespace.name, locale: "en" });

  return (
    <CMSProvider
      initialLocale="en"
      initialTranslations={{ common }}
    >
      {children}
    </CMSProvider>
  );
}
```

`useTranslations(commonNamespace)` in any child component will read from context immediately — no `useEffect` fetch, no hydration delay.

## Background polling

`CMSProvider` supports a `refetchInterval` (in seconds) to keep translations fresh without a page reload:

```tsx
<CMSProvider initialLocale="en" refetchInterval={300}>
  {children}
</CMSProvider>
```

Every 300 seconds, all loaded namespaces and slugs are re-fetched in parallel. This is useful for long-lived SPAs where editors may update content while users are active.

## Edge / CDN caching

The API sets `Cache-Control: s-maxage=60, stale-while-revalidate=300` on translation GET responses. CDNs (Cloudflare, Vercel Edge, Nginx) will:

- Serve cached responses for up to 60 seconds without hitting the origin
- Serve stale responses for up to 300 more seconds while revalidating in the background

To invalidate the CDN cache after an admin update, you can purge the relevant URL from your CDN provider's dashboard or API. The `events` emitter on the CMS instance can trigger this automatically:

```ts
cms.events.on("translations:updated", async ({ namespace, locale }) => {
  await purgeCDN(`/cms/translations/${namespace}/${locale}`);
});
```

## Cache interaction between tiers

```
In-memory hit        → return (no network, no fallback)
In-memory miss       → HTTP fetch
  HTTP success       → store in memory, return
  HTTP failure       → call fallback loader
    Fallback success → return (does NOT store in memory — fallback is stale by definition)
    Fallback failure → return raw key string
```

Fallback results are intentionally not cached in memory. If the API recovers, the next call (after TTL expiry or manual invalidation) will fetch fresh data.


---

[← Fallback Strategy](fallback-strategy.md) | [Plugin System →](plugins.md)
