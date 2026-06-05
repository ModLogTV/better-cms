# Admin Hooks (React)

- [Setup](#setup)
- [AdminQueryProvider](#adminqueryprovider)
- [Hooks reference](#hooks-reference)
  - [`useNamespaceTranslations({ namespace, locale })`](#usenamespacetranslations-namespace-locale)
  - [`useUpdateTranslation()`](#useupdatetranslation)
  - [`usePages()`](#usepages)
  - [`usePage({ slug, locale, draft? })`](#usepage-slug-locale-draft)
  - [`useUpdatePage()`](#useupdatepage)
  - [`usePublishPage()`](#usepublishpage)
  - [`useDescribeNamespace({ namespace })`](#usedescribenamespace-namespace)
  - [`useMediaList()`](#usemedialist)
  - [`useMediaUpload()`](#usemediaupload)
  - [`useLocales()`](#uselocales)
  - [`useUpsertLocale()`](#useupsertlocale)
  - [`useDeleteLocale()`](#usedeletelocale)
- [User & Group hooks](#user-group-hooks)
  - [`useUsers()`](#useusers)
  - [`useUserPermissions({ userId })`](#useuserpermissions-userid)
  - [`useSetUserPermissions()`](#usesetuserpermissions)
  - [`useUserGroups({ userId })`](#useusergroups-userid)
  - [`useAddUserToGroup()`](#useaddusertogroup)
  - [`useRemoveUserFromGroup()`](#useremoveuserfromgroup)
  - [`useGroups()`](#usegroups)
  - [`useCreateGroup()`](#usecreategroup)
  - [`useUpdateGroup()`](#useupdategroup)
  - [`useDeleteGroup()`](#usedeletegroup)
- [TanStack Query keys](#tanstack-query-keys)

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
  useMediaList,
  useMediaUpload,
  useLocales,
  useUpsertLocale,
  useDeleteLocale,
  useUsers,
  useUserPermissions,
  useSetUserPermissions,
  useUserGroups,
  useAddUserToGroup,
  useRemoveUserFromGroup,
  useGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} = createAdminHooks(admin);

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

### `useMediaList()`

Lists all recorded media assets.

```tsx
const { data: assets } = useMediaList();
// data: MediaAsset[] | undefined
```

Query key: `["cms", "media"]`

### `useMediaUpload()`

Handles the full presign → PUT → confirm flow in one call. Invalidates `["cms", "media"]` on settle.

```tsx
const { upload, isPending } = useMediaUpload();

const handleFile = async (file: File) => {
  const { publicUrl, assetId } = await upload({ file });
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

## User & Group hooks

These hooks are only functional when the backend uses `betterAuthCMSAdapter` (i.e., `cms.auth.management` is present). If using `tokenAuthAdapter`, all user/group API calls return 404.

### `useUsers()`

Lists all CMS users with their direct permissions and group IDs.

```tsx
const { data: users } = useUsers();
// data: CMSUserSummary[] | undefined
// [{ id, email, name, permissions: string[], groupIds: string[] }]
```

Query key: `["cms", "users"]`

### `useUserPermissions({ userId })`

Returns the resolved permission set for a user (direct + inherited from groups).

```tsx
const { data: permissions } = useUserPermissions({ userId: "u1" });
// data: string[] | undefined
```

Query key: `["cms", "users", userId, "permissions"]`

### `useSetUserPermissions()`

Replaces a user's direct permissions. Does not affect group-inherited permissions.

```tsx
const { mutate } = useSetUserPermissions();
mutate({ userId: "u1", permissions: ["cms:translations:write"] });
```

Invalidates `["cms", "users", userId, "permissions"]` and `["cms", "users"]` on settle.

### `useUserGroups({ userId })`

Lists the groups a user belongs to.

```tsx
const { data: groups } = useUserGroups({ userId: "u1" });
// data: CMSGroup[] | undefined
```

Query key: `["cms", "users", userId, "groups"]`

### `useAddUserToGroup()`

```tsx
const { mutate } = useAddUserToGroup();
mutate({ userId: "u1", groupId: "g1" });
```

### `useRemoveUserFromGroup()`

```tsx
const { mutate } = useRemoveUserFromGroup();
mutate({ userId: "u1", groupId: "g1" });
```

### `useGroups()`

Lists all CMS groups.

```tsx
const { data: groups } = useGroups();
// data: CMSGroup[] | undefined
// [{ id, name, permissions: string[] }]
```

Query key: `["cms", "groups"]`

### `useCreateGroup()`

```tsx
const { mutate } = useCreateGroup();
mutate({ name: "Editors", permissions: ["cms:translations:write", "cms:pages:write"] });
```

### `useUpdateGroup()`

```tsx
const { mutate } = useUpdateGroup();
mutate({ id: "g1", name: "Senior Editors" });
mutate({ id: "g1", permissions: ["cms:pages:publish"] });
```

### `useDeleteGroup()`

```tsx
const { mutate } = useDeleteGroup();
mutate({ id: "g1" });
```

Invalidates `["cms", "groups"]` and `["cms", "users"]` on settle (group deletion affects user summaries).

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
