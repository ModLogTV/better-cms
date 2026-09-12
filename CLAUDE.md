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
- **Hooks:** `useTranslations(ns)` and `usePageContent({ slug })` read from `CMSProvider` context, exposing `{ data, isLoading, error }`.
- **Server Components (RSC):** Cannot use hooks. Use `loadTranslations({ namespace: ns.name, locale })` + `createTranslator({ ns, translations: data, locale })` manually.

## Admin UI

- Admin hooks (via `@modlog/better-cms/admin/react`) *do* use TanStack Query and require `AdminQueryProvider`.
- Full TanStack Start server function wrappers are provided via `@modlog/better-cms/tanstack-start`.
  
### Admin UI: error display convention

Action errors in `admin-ui` (a failed mutation - move, delete, save, etc.) are shown **in place**, not as a toast: the icon on the control that triggered the action swaps to `IconAlertTriangle` in `text-destructive`, and a destructive-variant `Tooltip` (`<TooltipContent variant="destructive">`) pinned open shows the error message right next to where the action happened. Both revert back to normal after a few seconds - see `admin-ui/src/lib/use-transient-error.ts` (`useTransientError`) for the reusable timer/state, and `TreeRow`'s drag handle in `admin-ui/src/routes/_layout/pages/index.tsx` for a worked example. This is the standard for every action error in the admin UI going forward - do not add new `toast.error(...)` calls for action failures; use this pattern instead. `toast.success(...)` for successful actions is unaffected and stays as-is.

### Admin UI: tailored primitives over copy-paste layouts

Each admin page's controls should match the actual shape of what it manages, not the shape of whatever an earlier page happened to use. A page-subtree scope needs a tree picker; a graph relationship (e.g. a group nested in multiple other groups) needs a chip-based "belongs to" combobox plus a reverse read-only list, not a drag-and-drop tree - that implies a single parent, which a graph doesn't have. A value resolved from multiple sources (e.g. permissions inherited through nesting) needs its own resolved/"effective" preview showing provenance, not a bare checkbox list pretending everything is direct. Interactive pickers, not free-text fields the user has to fill in from memory - if the data already exists somewhere in the system (a user, a page, a tag, a group), the field to reference it should let the user search/browse/pick it, never type a raw id. Before reaching for an existing widget (Dialog vs. Sheet vs. a full detail route, table vs. cards vs. tree), ask whether the data actually has that shape. Reuse the *interaction conventions* that are genuinely cross-cutting (the error-display convention above, permission-gating, empty states, loading skeletons) - not the *layout* of whichever page shipped first. The goal is that every page reads as built for what it's showing, not as a copy of the last page with the labels swapped.

## Tech Stack & Commands

- **Build:** `tsup` (outputs to `dist/`, split by platform: `neutral`, `node`, `browser`).
- **Tests:** `bun test` (runtime assertions) + `tsc --noEmit` (type assertions). Run both via `bun run test`.
- **Formatting/Linting:** Biome (`bun run format` runs `biome check --write .`).

## Marketing Copy and UI texts

Never user em/en dashes or hyphens to separate two sentences.