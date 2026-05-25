# Using Page Content

## Client components

```tsx
"use client";
import { usePageContent } from "@modlog/better-cms/react";

export function DynamicPage({ slug }: { slug: string }) {
  const blocks = usePageContent(slug);

  return (
    <main>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":
            return <Hero key={i} data={block.data as HeroData} />;
          case "feature-grid":
            return <FeatureGrid key={i} data={block.data as FeatureGridData} />;
          default:
            return null;
        }
      })}
    </main>
  );
}
```

`usePageContent(slug)` returns `RawBlock[]` — `{ type: string; data: unknown }[]`. Cast `data` to your known type, or use `cms.$Infer.PageBlocks` for type-safe rendering.

### How `usePageContent` works

1. Checks `CMSProvider` context for the slug — no fetch if pre-loaded
2. If missing, calls `loadPageContent({ slug, locale })` in a `useEffect`
3. Updates context so other components sharing the same slug don't fetch again

## Server components

```tsx
import { loadPageContent } from "@modlog/better-cms/client";

export default async function Page({ params }) {
  const blocks = await loadPageContent({ slug: params.slug, locale: params.locale });

  return (
    <main>
      {blocks.map((block, i) => renderBlock(block, i))}
    </main>
  );
}
```

## Pre-seeding via CMSProvider

```tsx
// Server layout
const homeBlocks = await loadPageContent({ slug: "home", locale: "en" });

<CMSProvider
  initialLocale="en"
  initialContent={{ home: homeBlocks }}
>
  {children}
</CMSProvider>
```

`usePageContent("home")` in a child component will read from context without an additional fetch.

## Type-safe block rendering

Use `cms.$Infer.PageBlocks` (set by `pagesPlugin`) for exhaustive type checking:

```ts
// Export the type from your API package
// apps/api/src/cms.ts
export type { cms } from "./cms"; // or export the type directly

// In your web app
import type { cms } from "@repo/api";
type AnyBlock = typeof cms.$Infer.PageBlocks;

function renderBlock(block: AnyBlock, key: number) {
  switch (block.type) {
    case "hero":
      // block.data is fully typed here
      return <Hero key={key} title={block.data.title} />;
    case "feature-grid":
      return <FeatureGrid key={key} items={block.data.items} />;
  }
  // TypeScript will warn if you add a block to ALL_PAGE_BLOCKS but don't handle it here
}
```

## Draft vs. published

By default, `loadPageContent` and `usePageContent` only return published pages. To fetch drafts (for preview/admin purposes), use the admin client:

```ts
const admin = createAdminClient({ ... });
const page = await admin.pages.get({ slug, locale, draft: true }); // draft = true
```

The public-facing hooks never expose draft content.

## API routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cms/pages` | List all pages (admin, requires token) |
| `GET` | `/cms/pages/:slug` | Get a page by slug (`?locale=en&draft=false`) |
| `PUT` | `/cms/pages/:id` | Update page blocks (validates against schemas) |
| `POST` | `/cms/pages/:id/publish` | Promote draft to published |

All page routes require `pagesPlugin` to be registered.


---

[← Defining Page Blocks](defining-blocks.md) | [Elysia Adapter →](../framework-adapters/elysia.md)
