# Admin Client

`createAdminClient` returns a typed HTTP client for all CMS write operations. Use it on the server (SSR loaders, server functions, API routes) — never expose the admin token to the browser.

## Setup

```ts
import { createAdminClient } from "@modlog/better-cms/admin";

const admin = createAdminClient({
  cmsUrl: process.env.CMS_URL!,      // e.g. "http://localhost:3001"
  token: process.env.CMS_ADMIN_TOKEN!,
});
```

## Namespaces

### `admin.namespaces.list()`

Returns all registered namespaces.

```ts
const namespaces = await admin.namespaces.list();
// [{ name: "common" }, { name: "dashboard" }]
```

### `admin.namespaces.describe({ namespace })`

Returns metadata for each key in the namespace. Useful for building admin editor UIs that need to know which input widget to render.

```ts
const meta = await admin.namespaces.describe({ namespace: "common" });
// [
//   { key: "submit", type: "key", inputHint: "text" },
//   { key: "greeting", type: "vars", vars: ["name"], inputHint: "text+vars" },
//   { key: "itemCount", type: "plural", vars: ["count"], inputHint: "text+count" },
//   { key: "terms", type: "rich", tags: ["b", "link"], inputHint: "rich-text" },
// ]
```

inputHint values:

| Value | When to use |
|-------|-------------|
| "text" | Plain string input |
| "text+vars" | Input with variable hints displayed |
| "text+count" | Input for each plural suffix (_one, _other, etc.) |
| "rich-text" | Rich text editor with tag support |

### `admin.namespaces.getTranslations({ namespace, locale })`

Returns all key→value pairs for a namespace + locale.

```ts
const translations = await admin.namespaces.getTranslations({ namespace: "common", locale: "en" });
// { "submit": "Submit", "greeting": "Hello, {name}!" }
```

### `admin.namespaces.updateTranslation({ namespace, locale, key, value })`

Updates a single translation key. Internally: fetches current state, merges the change, PUTs the full object back.

```ts
await admin.namespaces.updateTranslation({
  namespace: "common",
  locale: "en",
  key: "submit",
  value: "Submit Form",
});
```

## Pages

### `admin.pages.list()`

Returns all pages with basic metadata.

```ts
const pages = await admin.pages.list();
// [{ id: "...", slug: "home", locale: "en", status: "published", updatedAt: Date }]
```

### `admin.pages.get({ slug, locale, draft })`

Returns a full page including blocks.

```ts
const page = await admin.pages.get({ slug: "home", locale: "en" });
const draft = await admin.pages.get({ slug: "home", locale: "en", draft: true }); // fetch draft
```

### `admin.pages.update({ id, blocks })`

Saves block data to a page. Sets status to `"draft"`.

```ts
await admin.pages.update({
  id: pageId,
  blocks: [
    { type: "hero", data: { title: "Welcome", ctaLabel: "Start", ctaHref: "/" } },
    { type: "feature-grid", data: { items: ["Speed", "Safety", "DX"] } },
  ],
});
```

The API validates each block against its registered Zod schema. Invalid blocks are rejected with a 400 error.

### `admin.pages.publish({ id })`

Promotes the current draft to `"published"` status.

```ts
await admin.pages.publish({ id: pageId });
```

## Media

### `admin.media.upload({ file, body })`

The easiest way to upload files. Handles presigning and the actual upload in one call.

```ts
const { publicUrl } = await admin.media.upload({
  file: { name: "hero.png", type: "image/png", size: file.size },
  body: file, // the actual binary data
});

// Use publicUrl in your page blocks
await admin.pages.update({
  id: pageId,
  blocks: [{ type: "hero", data: { imageUrl: publicUrl } }],
});
```

### `admin.media.delete({ key })`

Permanently removes a file from storage.

```ts
await admin.media.delete({ key: "1234567-hero.png" });
```

### `admin.media.presign({ filename, mimeType, size })`

Low-level method to only generate a presigned upload URL.

```ts
const { uploadUrl, publicUrl } = await admin.media.presign({
  filename: "hero.png",
  mimeType: "image/png",
  size: file.size,
});
```

## Locales

### `admin.locales.list()`

```ts
const locales = await admin.locales.list();
// [{ code: "en", name: "English", isDefault: true, updatedAt: Date }]
```

### `admin.locales.upsert({ code, name, isDefault })`

```ts
await admin.locales.upsert({ code: "de", name: "German" });
await admin.locales.upsert({ code: "en", name: "English", isDefault: true }); // set as default
```

### `admin.locales.delete({ code })`

```ts
await admin.locales.delete({ code: "fr" });
```

## Users

Available when `auth.management` is defined (e.g. `betterAuthCMSAdapter`). Requires `cms:users:manage` permission.

### `admin.users.list()`

Returns all CMS users with their direct permissions and group IDs.

```ts
const users = await admin.users.list();
// [{ id: "...", email: "alice@example.com", name: "Alice", permissions: [], groupIds: ["group-1"] }]
```

### `admin.users.getPermissions({ userId })`

Returns the resolved permission set — direct permissions merged with all group permissions.

```ts
const perms = await admin.users.getPermissions({ userId: "user-1" });
// ["cms:translations:read", "cms:pages:write"]
```

### `admin.users.setPermissions({ userId, permissions })`

Replaces the direct permissions on a user. Group-inherited permissions are unaffected.

```ts
await admin.users.setPermissions({
  userId: "user-1",
  permissions: ["cms:translations:write", "cms:locales:read"],
});
```

Pass `[]` to clear all direct permissions.

### `admin.users.getGroups({ userId })`

Lists all groups the user belongs to.

```ts
const groups = await admin.users.getGroups({ userId: "user-1" });
// [{ id: "group-1", name: "Editors", permissions: ["cms:translations:write"] }]
```

### `admin.users.addToGroup({ userId, groupId })`

Adds a user to a group.

```ts
await admin.users.addToGroup({ userId: "user-1", groupId: "group-1" });
```

### `admin.users.removeFromGroup({ userId, groupId })`

Removes a user from a group. Does not delete the group.

```ts
await admin.users.removeFromGroup({ userId: "user-1", groupId: "group-1" });
```

## Groups

Available when `auth.management` is defined. Requires `cms:groups:manage` permission.

### `admin.groups.list()`

Returns all CMS groups.

```ts
const groups = await admin.groups.list();
// [{ id: "group-1", name: "Editors", permissions: ["cms:translations:write", "cms:pages:write"] }]
```

### `admin.groups.create({ name, permissions })`

Creates a new group. `permissions` is an array of `CMSPermission` strings.

```ts
import { CMS_PERMISSIONS } from "@modlog/better-cms/auth";

const group = await admin.groups.create({
  name: "Editors",
  permissions: [
    CMS_PERMISSIONS.TRANSLATIONS_WRITE,
    CMS_PERMISSIONS.PAGES_WRITE,
    CMS_PERMISSIONS.PAGES_PUBLISH,
  ],
});
// { id: "...", name: "Editors", permissions: [...] }
```

### `admin.groups.update({ id, name?, permissions? })`

Updates a group's name, permissions, or both.

```ts
await admin.groups.update({
  id: "group-1",
  permissions: [CMS_PERMISSIONS.TRANSLATIONS_WRITE],
});
```

### `admin.groups.delete({ id })`

Permanently removes a group. All user memberships are removed via cascade.

```ts
await admin.groups.delete({ id: "group-1" });
```

## Error handling

All methods throw `CMSError` on non-2xx responses:

```ts
import { CMSError } from "@modlog/better-cms/admin";

try {
  await admin.pages.update({ id, blocks });
} catch (err) {
  if (err instanceof CMSError) {
    console.error(`CMS error ${err.status}: ${err.message}`);
  }
}
```

`CMSError` has a `.status` number property (the HTTP status code).


---

[← Fallback Sync Plugin](../plugins/fallback-sync-plugin.md) | [Admin Hooks (React) →](admin-hooks.md)
