# Defining Page Blocks

## What is a page block?

A page block is a typed unit of page content. Each block has a `type` string and a Zod-validated `data` shape. Pages are stored as an ordered array of blocks — the frontend renders them by type.

This is **not** a WYSIWYG editor. Blocks are data-first: you define the schema, the admin UI saves values, and your components render them. Think of it as "data-driven components."

## Block definition

```ts
import { z } from "zod";
import type { PageBlock } from "@modlog/better-cms/plugins/pages";

export const heroBlock: PageBlock = {
  type: "hero",
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    ctaLabel: z.string(),
    ctaHref: z.string().url(),
  }),
};
```

`type` must be unique across all blocks in your app. It is used to identify and render the correct component.

`schema` is a Zod schema for the block's `data` field. The API validates incoming blocks against this schema on `PUT /cms/pages/:id`.

## Registering blocks

Collect all blocks in your shared config package and pass them to `pagesPlugin`:

```ts
// packages/cms-config/index.ts
export const heroBlock: PageBlock = { type: "hero", schema: z.object({ ... }) };
export const featureGridBlock: PageBlock = { type: "feature-grid", schema: z.object({ ... }) };

export const ALL_PAGE_BLOCKS = [heroBlock, featureGridBlock];
```

```ts
// apps/api/src/cms.ts
import { pagesPlugin } from "@modlog/better-cms/plugins/pages";
import { ALL_PAGE_BLOCKS } from "@repo/cms-config";

plugins: [
  pagesPlugin({ blocks: ALL_PAGE_BLOCKS }),
]
```

## Type inference

`pagesPlugin` extends `cms.$Infer.PageBlocks` with a discriminated union of all registered block types:

```ts
type Block = typeof cms.$Infer.PageBlocks;
// Equivalent to:
// | { type: "hero"; data: { title: string; subtitle?: string; ctaLabel: string; ctaHref: string } }
// | { type: "feature-grid"; data: { ... } }
```

Use this type in your frontend for type-safe block rendering:

```tsx
import type { cms } from "@repo/api"; // or wherever you export your cms instance type

type Block = typeof cms.$Infer.PageBlocks;

function renderBlock(block: Block) {
  switch (block.type) {
    case "hero":
      return <Hero {...block.data} />;
    case "feature-grid":
      return <FeatureGrid {...block.data} />;
  }
}
```

## Block design guidelines

### Prefer granular blocks

Instead of one massive `Content` block with 20 optional fields, create specific blocks:

```ts
// ✗ Avoid: one block, many optional fields
const contentBlock: PageBlock = {
  type: "content",
  schema: z.object({
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    featureTitle: z.string().optional(),
    featureItems: z.array(z.string()).optional(),
    pricingTier: z.string().optional(),
    // ... 15 more fields
  }),
};

// ✓ Prefer: separate blocks
const heroBlock: PageBlock = {
  type: "hero",
  schema: z.object({ title: z.string(), subtitle: z.string().optional() }),
};

const featureGridBlock: PageBlock = {
  type: "feature-grid",
  schema: z.object({ title: z.string(), items: z.array(z.string()) }),
};
```

This maps 1:1 to your React components and makes admin UIs easier to build.

### Types are permanent

Avoid renaming `type` strings. Pages in the database reference block types by string. If you rename `"hero"` to `"header"`, all pages with hero blocks break. Add a migration instead.

## Block storage

Pages are stored as `JSON` in the database:

```json
[
  {
    "type": "hero",
    "data": {
      "title": "Welcome",
      "subtitle": "The CMS for monorepos",
      "ctaLabel": "Get Started",
      "ctaHref": "/docs"
    }
  }
]
```

The `data` field is untyped in the DB — validation only happens on write via the Zod schema.


---

[← Using Translations](../translations/using-translations.md) | [Using Page Content →](using-page-content.md)
