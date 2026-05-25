# Pages Plugin

Adds page block CRUD routes to the CMS and extends `cms.$Infer.PageBlocks` with a typed block union.

## Registration

```ts
import { pagesPlugin } from "@modlog/better-cms/plugins/pages";
import { ALL_PAGE_BLOCKS } from "@repo/cms-config";

const cms = createCMS({
  // ...
  plugins: [
    pagesPlugin({ blocks: ALL_PAGE_BLOCKS }),
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `blocks` | `PageBlock[]` | `[]` | Block definitions to register |

## Routes added

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cms/pages` | List all pages |
| `GET` | `/cms/pages/:slug` | Get page by slug (`?locale=en&draft=false`) |
| `PUT` | `/cms/pages/:id` | Update page blocks |
| `POST` | `/cms/pages/:id/publish` | Publish page |

All routes require the `x-internal-token` header.

## Block validation

When a `PUT /cms/pages/:id` request arrives, each block in the array is validated against its registered Zod schema. Blocks with unknown `type` values are rejected. This validation happens in the route handler before calling the adapter.

## Type inference

```ts
type Block = typeof cms.$Infer.PageBlocks;
// Discriminated union:
// | { type: "hero"; data: { title: string; subtitle?: string } }
// | { type: "feature-grid"; data: { ... } }
```

Use this in your frontend for exhaustive block rendering:

```ts
function render(block: typeof cms.$Infer.PageBlocks) {
  switch (block.type) {
    case "hero": return <Hero {...block.data} />;
  }
}
```

## Page lifecycle

```
Create / Edit → PUT /cms/pages/:id     (status: "draft")
Preview       → GET /cms/pages/:slug?draft=true
Publish       → POST /cms/pages/:id/publish  (status: "published")
Public access → GET /cms/pages/:slug   (only published)
```

Draft pages are not returned by the public read endpoint. The admin client's `pages.get(slug, locale, true)` fetches drafts.

## PageBlock type

```ts
import type { PageBlock } from "@modlog/better-cms/plugins/pages";

const myBlock: PageBlock = {
  type: "my-block",
  schema: z.object({ title: z.string() }),
};
```

`PageBlock` is an alias for `BlockDefinition<Type, Data>`. Both names are exported.


---

[← Local Storage Adapter (Dev Only)](../storage-adapters/local.md) | [Media Plugin →](media-plugin.md)
