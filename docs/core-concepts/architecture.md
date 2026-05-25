# Architecture

## System overview

```
┌─────────────────────────────────┐
│         Shared Config           │
│  @repo/cms-config               │
│  defineNamespace / PageBlock    │
└─────────────┬───────────────────┘
              │ imports
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌───────────┐     ┌──────────────────┐
│  API App  │     │   Web App        │
│  Elysia   │◄────│ loadTranslations │
│  Prisma   │     │ useTranslatuions │
│  /cms/*   │     │ CMSProvider      │
└─────┬─────┘     └──────────────────┘
      │
      ▼
┌──────────┐
│ Database │
│  Prisma  │
└──────────┘
```

## Package structure

`@modlog/better-cms` is split into subpath exports. Each subpath has its own bundled output and is tree-shaken independently.

| Import path                                | Platform | Purpose                                                         |
| ------------------------------------------ | -------- | --------------------------------------------------------------- |
| `@modlog/better-cms`                       | Node     | `createCMS` — initializes the CMS instance                      |
| `@modlog/better-cms/i18n`                  | Neutral  | `defineNamespace`, markers, `createTranslator`                  |
| `@modlog/better-cms/client`                | Neutral  | `configureCMSClient`, `loadTranslations`, `loadPageContent`     |
| `@modlog/better-cms/react`                 | Browser  | `CMSProvider`, `useTranslations`, `usePageContent`, `useLocale` |
| `@modlog/better-cms/elysia`                | Node     | `toElysiaPlugin` — mounts routes                                |
| `@modlog/better-cms/next`                  | Node     | `toNextHandler`, `createNextMiddleware`                         |
| `@modlog/better-cms/next/client`           | Browser  | Next.js-specific client utilities                               |
| `@modlog/better-cms/tanstack-start`        | Node     | `createServerFns`                                               |
| `@modlog/better-cms/prisma`                | Node     | `prismaAdapter`                                                 |
| `@modlog/better-cms/drizzle`               | Node     | _(not yet implemented)_                                         |
| `@modlog/better-cms/admin`                 | Node     | `createAdminClient`                                             |
| `@modlog/better-cms/admin/react`           | Browser  | `createAdminHooks`, `AdminQueryProvider`                        |
| `@modlog/better-cms/plugins/pages`         | Node     | `pagesPlugin`                                                   |
| `@modlog/better-cms/plugins/media`         | Node     | `mediaPlugin`                                                   |
| `@modlog/better-cms/plugins/fallback`      | Node     | `fallbackPlugin`                                                |
| `@modlog/better-cms/plugins/fallback-sync` | Node     | `startFallbackSync`                                             |
| `@modlog/better-cms/storage/aws`           | Node     | `awsS3Adapter`                                                  |
| `@modlog/better-cms/storage/r2`            | Node     | `cloudflareR2Adapter`                                           |
| `@modlog/better-cms/storage/hetzner`       | Node     | `hetznerS3Adapter`                                              |
| `@modlog/better-cms/storage/local`         | Node     | `localStorageAdapter`                                           |

## Data flow: translations

```
1. Frontend requests "common" namespace, locale "en"
2. In-memory cache hit? → return immediately
3. loadTranslations({ namespace: "common", locale: "en" }) → GET /cms/translations/common/en
4. API reads from DB via adapter → returns Record<string, string>
5. Cache stores result with 60s TTL
6. createTranslator({ ns, translations: data, locale: "en" }) → typed t() function
7. t("greeting", { name: "Ada" }) → "Hello, Ada!"
```

If the API is unreachable and a `fallback` loader is configured:

```
3b. fallback("common", "en") → import("./locales/en/common.json")
```

## Data flow: page blocks

```
1. Frontend requests slug "/about", locale "en"
2. loadPageContent({ slug: "/about", locale: "en" }) → GET /cms/pages/about?locale=en
3. API returns { blocks: [{ type: "hero", data: { title: "..." } }] }
4. Frontend renders blocks by type
```

## Plugin system

Plugins extend `createCMS` at initialization time. Each plugin receives the `CMSContext` object and mounts additional Elysia routes or attaches event listeners.

```ts
const myPlugin: CMSPlugin = {
  name: "my-plugin",
  init(ctx) {
    // ctx.elysiaApp — mount routes here
    // ctx.events — listen to "translations:updated"
    // ctx.adapter — access DB
    // ctx.storage — access storage
  },
  extendInfer(current) {
    // optionally extend cms.$Infer with new types
    return current;
  },
};
```

See [Plugin System](./plugins.md) for details.

## Authentication

All routes require the `x-internal-token` header. The CMS uses two levels of access:

- **`auth.readToken`**: Allows GET requests to translations and single pages. Safe to use in the frontend via a read-only proxy or if properly scoped.
- **`auth.adminToken`**: Full administrative access (writes, media, locales, listing all pages). **Never** expose this token in client-side code.

Both tokens are checked against the `x-internal-token` header. The API automatically determines which token level is required for each route.

## Zero runtime dependencies

The core package (`@modlog/better-cms`) has no production dependencies outside of `elysia` (used for the internal app instance). All framework integrations are peer dependencies. This keeps the bundle small and avoids version conflicts in consumer projects.


---

[← Database Schema](../getting-started/database-schema.md) | [Namespaces & Markers →](namespaces.md)
