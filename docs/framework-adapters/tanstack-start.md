# TanStack Start Adapter

## Server functions

`createServerFns` wraps an `AdminClient` instance into plain async functions suitable for use as TanStack Start server function handlers.

**`apps/admin/src/cms-fns.ts`**

```ts
import { createServerFn } from "@tanstack/start";
import { createAdminClient } from "@modlog/better-cms/admin";
import { createServerFns } from "@modlog/better-cms/tanstack-start";

const admin = createAdminClient({
  cmsUrl: process.env.CMS_URL!,
  token: process.env.CMS_ADMIN_TOKEN!,
});

const fns = createServerFns(admin);

export const getNamespaces = createServerFn({ method: "GET" })
  .handler(() => fns.listNamespaces());

export const getTranslations = createServerFn({ method: "GET" })
  .validator((d: { namespace: string; locale: string }) => d)
  .handler(({ data }) => fns.getTranslations({ namespace: data.namespace, locale: data.locale }));

export const updateTranslation = createServerFn({ method: "POST" })
  .validator((d: { namespace: string; locale: string; key: string; value: string }) => d)
  .handler(({ data }) =>
    fns.updateTranslation({
      namespace: data.namespace,
      locale: data.locale,
      key: data.key,
      value: data.value,
    })
  );

export const getPages = createServerFn({ method: "GET" })
  .handler(() => fns.listPages());

export const updatePage = createServerFn({ method: "POST" })
  .validator((d: { id: string; blocks: unknown[] }) => d)
  .handler(({ data }) => fns.updatePage({ id: data.id, blocks: data.blocks }));

export const publishPage = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(({ data }) => fns.publishPage({ id: data.id }));
```

## Available server fn wrappers

`createServerFns(admin)` returns an object with these methods:

| Method | Delegates to |
|--------|-------------|
| `listNamespaces()` | `admin.namespaces.list()` |
| `getTranslations({ namespace, locale })` | `admin.namespaces.getTranslations()` |
| `updateTranslation({ namespace, locale, key, value })` | `admin.namespaces.updateTranslation()` |
| `listPages()` | `admin.pages.list()` |
| `getPage({ slug, locale, draft? })` | `admin.pages.get()` |
| `updatePage({ id, blocks })` | `admin.pages.update()` |
| `publishPage({ id })` | `admin.pages.publish()` |
| `listLocales()` | `admin.locales.list()` |

## Usage in routes

```tsx
// routes/admin/translations.tsx
import { getTranslations, updateTranslation } from "../cms-fns";

export const loader = () =>
  getTranslations({ data: { namespace: "common", locale: "en" } });

export default function TranslationsPage() {
  const data = useLoaderData();
  // ...
}
```

## Notes

- Server functions run on the server — the `CMS_ADMIN_TOKEN` is never exposed to the browser
- `createServerFns` is a thin wrapper — it does not add caching or error handling beyond what `AdminClient` provides
- For React hooks in TanStack Start apps, you can still use `createAdminHooks` from `@modlog/better-cms/admin/react` — it works in any React environment with TanStack Query


---

[← Next.js Adapter](next.md) | [Prisma Adapter →](../database-adapters/prisma.md)
