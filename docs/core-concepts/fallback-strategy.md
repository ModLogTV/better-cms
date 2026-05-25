# Fallback Strategy

Translations are resolved through a 4-tier chain. The goal: your UI never breaks, even if the CMS API is down.

## Resolution order

```
1. In-memory cache (60s TTL)
        ↓ miss or expired
2. CMS API  →  GET /cms/translations/{namespace}/{locale}
        ↓ unreachable or error
3. Fallback loader  →  import("./locales/en/common.json")
        ↓ loader returns null or throws
4. Raw key string  →  "common.submit"
```

## Tier 1: In-memory cache

Every successful API response is stored in a global `Map` with a 60-second TTL. Subsequent calls for the same namespace + locale within the TTL skip the network entirely.

The cache is a module-level singleton — it is shared across all concurrent SSR requests for the lifetime of the Node.js process. This is intentional: it acts as a warm process cache that avoids redundant fetches when many requests arrive simultaneously.

Cache entries can be manually invalidated:

```ts
import { deleteCached } from "@modlog/better-cms/client";

deleteCached("translations:common:en");
```

## Tier 2: CMS API

`loadTranslations({ namespace, locale })` sends `GET /cms/translations/{namespace}/{locale}` with the `x-internal-token` header. Returns `Record<string, string>`.

Request deduplication: if two components call `loadTranslations({ namespace: "common", locale: "en" })` at the same time (before the first response arrives), only one HTTP request is sent. Both callers receive the same Promise.

## Tier 3: Local JSON fallback

Configured via the `fallback` option in `configureCMSClient`:

```ts
configureCMSClient({
  cmsUrl: "...",
  readToken: "...",
  fallback: async (namespace, locale) => {
    try {
      return (await import(`./locales/${locale}/${namespace}.json`)).default;
    } catch {
      return null;
    }
  },
});
```

The fallback loader receives the namespace name and locale string. It should return `Record<string, string>` or `null` if no fallback is available.

Dynamic `import()` is the recommended approach because bundlers (webpack, Turbopack, Vite) can resolve these statically and include the JSON in the bundle or emit them as chunks. The CMS writes these files via `fallbackPlugin` or `startFallbackSync`.

## Tier 4: Raw key string

If all three tiers fail, `t("submit")` returns `"submit"`. This is the last resort and should never happen in a correctly configured production environment.

## Keeping fallback files up to date

Two strategies depending on your deployment:

### Same-disk deployment (fallbackPlugin)

API and frontend share a disk. The API writes JSON files on every translation update.

```ts
import { fallbackPlugin } from "@modlog/better-cms/plugins/fallback";

plugins: [
  fallbackPlugin({
    outputDir: "../web/locales", // relative to API, must be readable by web
  }),
]
```

Files are written to `{outputDir}/{locale}/{namespace}.json` on every `translations:updated` event.

### Separate containers (startFallbackSync)

API and frontend have separate disk volumes. The frontend fetches and writes fallback files itself.

```ts
// apps/web/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFallbackSync } = await import("@modlog/better-cms/plugins/fallback-sync");
    await startFallbackSync({
      cmsUrl: process.env.CMS_URL!,
      readToken: process.env.CMS_READ_TOKEN!,
      outputDir: "./locales",
      interval: 60 * 60 * 1000, // re-sync every hour
    });
  }
}
```

The initial sync is `await`ed — Next.js won't serve any requests until fallback files exist. See [Fallback Sync Plugin](../plugins/fallback-sync-plugin.md).

## Why this matters

In production, the CMS API should be considered a non-critical dependency for read traffic. A database restart, a deploy window, or a network blip should not take down your frontend. The fallback JSON files are a static snapshot that allows continued rendering from the last known state.


---

[← Locales](locales.md) | [Caching →](caching.md)
