# Fallback Sync Plugin

Syncs all CMS translations to local JSON files on startup, then polls on a configurable interval. Designed for deployments where the API and frontend run in separate containers (separate disk volumes).

## When to use

Use `startFallbackSync` when:
- Your CMS API and frontend are in separate Docker containers
- Your API and frontend are separate services with separate filesystems
- You need fallback files populated immediately on cold starts without waiting for an update event

If the API and frontend share a disk, use [Fallback Plugin](./fallback-plugin.md) instead — it's simpler and event-driven.

## Setup

### Step 1: Enable instrumentation (Next.js < 15 only)

```ts
// next.config.ts
export default {
  experimental: {
    instrumentationHook: true,
  },
};
```

Next.js 15+ enables instrumentation by default.

### Step 2: Create instrumentation.ts

Place this file at the root of your Next.js app (same level as `app/` and `pages/`):

```ts
// apps/web/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFallbackSync } = await import(
      "@modlog/better-cms/plugins/fallback-sync"
    );

    await startFallbackSync({
      cmsUrl: process.env.CMS_URL!,
      readToken: process.env.CMS_READ_TOKEN!,
      outputDir: "./locales",
      interval: 60 * 60 * 1000, // 1 hour (default)
    });
  }
}
```

The `await` ensures Next.js does not serve any request until the initial sync completes. Cold starts and container restarts are always safe.

### Step 3: Wire the fallback loader

```ts
// apps/web/src/cms-client.ts
configureCMSClient({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL!,
  readToken: process.env.NEXT_PUBLIC_CMS_READ_TOKEN!,
  fallback: async (namespace, locale) => {
    try {
      return (await import(`../locales/${locale}/${namespace}.json`)).default;
    } catch {
      return null;
    }
  },
});
```

`outputDir` in `startFallbackSync` must match the import path in `fallback` (relative to the loader file).

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cmsUrl` | `string` | required | Base URL of the CMS API |
| `readToken` | `string` | required | `x-internal-token` for read access |
| `outputDir` | `string` | required | Directory to write JSON files |
| `interval` | `number` | `3_600_000` | Poll interval in ms. Set to `0` to disable polling. |

## What it fetches

On each sync, `startFallbackSync`:

1. `GET /cms/admin/namespaces` — list all registered namespaces
2. `GET /cms/admin/locales` — list all active locales
3. For every (namespace, locale) combination: `GET /cms/translations/{namespace}/{locale}`
4. Writes `{outputDir}/{locale}/{namespace}.json`

The `readToken` is the same `x-internal-token` used by all CMS routes. No separate read-only token is needed.

## File structure

```
locales/
  en/
    common.json
    dashboard.json
  de/
    common.json
    dashboard.json
```

Same format as `fallbackPlugin`.

## Error handling

Sync errors (network failures, API down) are logged to `console.error` and do not throw — the interval continues. The initial sync (`await startFallbackSync(...)`) **does** throw on failure, so Next.js will fail to start if the CMS API is unreachable during boot.

If this behavior is too strict for your setup, wrap the call:

```ts
await startFallbackSync({ ... }).catch((err) => {
  console.warn("[cms] Initial fallback sync failed, continuing without:", err);
});
```

## Polling vs. event-driven

`startFallbackSync` polls on a fixed interval. It does not subscribe to push events from the CMS. If a translation is updated between polls, the fallback files reflect the old value until the next sync.

For real-time fallback updates in a separate-container setup, combine both plugins:
- `fallbackPlugin` in the API: writes to the API's local disk
- `startFallbackSync` in the frontend: syncs from API on schedule

Or implement a webhook-triggered sync using the `translations:updated` event.


---

[← Fallback Plugin](fallback-plugin.md) | [Admin Client →](../admin/admin-client.md)
