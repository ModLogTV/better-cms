# Admin Client

`createAdminClient` returns a typed HTTP client for all CMS write operations. Use it on the server (SSR loaders, server functions, API routes) — never expose the internal token to the browser.

## Setup

```ts
import { createAdminClient } from "@modlog/better-cms/admin";

const admin = createAdminClient({
  cmsUrl: process.env.CMS_URL!,      // e.g. "http://localhost:3001"
  token: process.env.CMS_INTERNAL_TOKEN!,
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

### `admin.media.presign({ filename, mimeType, size })`

Generates a presigned upload URL. The browser uses this to PUT the file directly to storage.

```ts
const { uploadUrl, publicUrl } = await admin.media.presign({
  filename: "hero.png",
  mimeType: "image/png",
  size: file.size,
});

await fetch(uploadUrl, { method: "PUT", body: file });
// publicUrl is now usable in block data
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
