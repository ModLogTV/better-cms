# Admin Hooks (React)

`createAdminHooks` returns TanStack Query-backed React hooks bound to an `AdminClient` instance. All hooks require `AdminQueryProvider` in the component tree.

## Setup

```tsx
import { createAdminClient } from "@modlog/better-cms/admin";
import { createAdminHooks, AdminQueryProvider } from "@modlog/better-cms/admin/react";

const admin = createAdminClient({
  cmsUrl: "/api", // proxied through your Next.js API routes
  token: process.env.CMS_ADMIN_TOKEN!,
});

export const {
  useNamespaceTranslations,
  useUpdateTranslation,
  usePages,
  usePage,
  useUpdatePage,
  usePublishPage,
  useDescribeNamespace,
  useMediaUpload,
  useLocales,
  useUpsertLocale,
  useDeleteLocale,
} = createAdminHooks({ client: admin });

// Wrap your admin app root:
export function AdminProvider({ children }) {
  return <AdminQueryProvider>{children}</AdminQueryProvider>;
}
```

## AdminQueryProvider

Wraps TanStack Query's `QueryClientProvider`. Mount once at the root of your admin app.

```tsx
import { AdminQueryProvider } from "@modlog/better-cms/admin/react";

function AdminApp() {
  return (
    <AdminQueryProvider>
      <App />
    </AdminQueryProvider>
  );
}
```

Pass a custom `QueryClient` if you need specific configuration:

```tsx
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

<AdminQueryProvider client={queryClient}>...</AdminQueryProvider>
```

## Hooks reference

### `useNamespaceTranslations({ namespace, locale })`

Fetches all translations for a namespace + locale.

```tsx
const { data, isLoading, error } = useNamespaceTranslations({ namespace: "common", locale: "en" });
// data: Record<string, string> | undefined
```

Query key: `["cms", "translations", namespace, locale]`

### `useUpdateTranslation()`

Mutation with **optimistic updates** — updates the cache immediately, rolls back on error.

```tsx
const { mutate, isPending } = useUpdateTranslation();

mutate({
  namespace: "common",
  locale: "en",
  key: "submit",
  value: "Submit Form",
});
```

### `usePages()`

Lists all pages.

```tsx
const { data: pages } = usePages();
// data: PageSummary[] | undefined
```

Query key: `["cms", "pages"]`

### `usePage({ slug, locale, draft? })`

Fetches a single page with its blocks.

```tsx
const { data: page } = usePage({ slug: "home", locale: "en" });
const { data: draft } = usePage({ slug: "home", locale: "en", draft: true });
// data: Page | undefined
```

Query key: `["cms", "page", slug, locale, draft]`

### `useUpdatePage()`

Mutation to save page blocks.

```tsx
const { mutate } = useUpdatePage();

mutate({
  id: page.id,
  blocks: [{ type: "hero", data: { title: "New Title" } }],
});
```

Invalidates `["cms", "pages"]` on settle.

### `usePublishPage()`

Mutation to publish a page.

```tsx
const { mutate: publish } = usePublishPage();
publish({ id: pageId });
```

### `useDescribeNamespace({ namespace })`

Fetches key metadata for building editor UIs.

```tsx
const { data: keys } = useDescribeNamespace({ namespace: "common" });
// data: KeyMetadata[] | undefined
// [{ key: "submit", type: "key", inputHint: "text" }, ...]
```

### `useMediaUpload()`

Handles the full presign + upload flow in one call.

```tsx
const { upload, isPending } = useMediaUpload();

const handleFile = async (file: File) => {
  const { publicUrl } = await upload({ file });
  // use publicUrl in block data
};
```

### `useLocales()`

```tsx
const { data: locales } = useLocales();
// data: Locale[] | undefined
```

### `useUpsertLocale()`

```tsx
const { mutate } = useUpsertLocale();
mutate({ code: "fr", name: "French", isDefault: false });
```

### `useDeleteLocale()`

```tsx
const { mutate } = useDeleteLocale();
mutate({ code: "fr" });
```

## TanStack Query keys

All hooks use `["cms", ...]` prefixed keys. If you have other TanStack Query state in the same app, there is no conflict as long as you don't use `["cms"]` as a prefix elsewhere.

To manually invalidate from outside a hook:

```ts
import { useQueryClient } from "@tanstack/react-query";

const qc = useQueryClient();
await qc.invalidateQueries({ queryKey: ["cms", "translations"] });
```


---

[← Admin Client](admin-client.md) | [Building an Admin UI →](building-admin-ui.md)
