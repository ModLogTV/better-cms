# `@modlog/better-cms` - Agent Guide

This is a headless, type-safe CMS for translations and page blocks, designed for **monorepos**.

## Core Architecture

- **Zero Runtime Dependencies:** The core logic has no dependencies. Frameworks (Elysia, Next.js, Prisma, AWS SDK) are peer dependencies and strictly separated via subpath exports.
- **Monorepo Design:** Namespaces and Block definitions **must** live in a shared config package (e.g., `@repo/cms-config`) so the API and Frontend share exactly the same types.
- **Dynamic Locales:** Managed via the database (`Locale` model) and accessible via `cms.adapter.listLocales()`.

## Storage & Adapters

- **Database Adapters:** Current active adapter is `prismaAdapter` (Drizzle is stubbed).
- **Storage Adapters:** Handle media via S3 presigned URLs. Names are suffixed with `Adapter`:
  - `awsS3Adapter`
  - `cloudflareR2Adapter`
  - `hetznerS3Adapter`
  - `localStorageAdapter` (dev only)

## Translations (i18n)

- **4-Tier Fallback Strategy:**
  1. In-memory cache (60s TTL)
  2. Database via API
  3. Local JSON (synced via `fallbackPlugin`)
  4. Raw key string
- **Markers:** `key`, `vars<{}>()`, `plural<{count}>()`, `rich<"b"|"link">()`.
- **Pluralization:** Evaluated at runtime using `Intl.PluralRules` (e.g., matches `items_one`, `items_other`).

## Frontend (React)

- **`configureCMSClient`:** Must be called globally (e.g., imported in Next.js `layout.tsx`) to set the singleton API endpoint.
- **Caching:** Uses an internal Promise Map to deduplicate concurrent requests. Do not attempt to replace this with TanStack Query on the consumer side.
- **Hooks:** `useTranslations(ns)` and `usePageContent(slug)` read from `CMSProvider` context to avoid initial layout shift, falling back to network if empty.
- **Server Components (RSC):** Cannot use hooks. Use `loadTranslations(ns, locale)` + `createTranslator(ns, data, locale)` manually.

## Admin UI

- Admin hooks (via `@modlog/better-cms/admin/react`) *do* use TanStack Query and require `AdminQueryProvider`.
- Full TanStack Start server function wrappers are provided via `@modlog/better-cms/tanstack-start`.

## Tech Stack & Commands

- **Build:** `tsup` (outputs to `dist/`, split by platform: `neutral`, `node`, `browser`).
- **Tests:** `bun test` (runtime assertions) + `tsc --noEmit` (type assertions). Run both via `bun run test`.
- **Formatting/Linting:** Biome (`bun run format` runs `biome check --write .`).
