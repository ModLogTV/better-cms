# Prisma Adapter

- [Setup](#setup)
- [Required schema](#required-schema)
- [How the adapter works](#how-the-adapter-works)
- [Data shape](#data-shape)
- [Monorepo usage](#monorepo-usage)

## Setup

```ts
import { prismaAdapter } from "@modlog/better-cms/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cms = createCMS({
  database: prismaAdapter(prisma),
  // ...
});
```

By default every page `PageVersion` is kept forever. To prune old ones, pass `pageVersionRetention` - the latest version and the currently-published version are never pruned:

```ts
prismaAdapter(prisma, {
  pageVersionRetention: { maxVersions: 50, maxAgeDays: 180 },
});
```

## Required schema

Copy these models into your `schema.prisma`. The adapter expects these exact model names, field names, and types.

```prisma
model TranslationNamespace {
  name   String
  locale String
  values Json   @default("{}")

  @@id([name, locale])
}

model Page {
  id          String    @id
  slug        String
  locale      String
  blocks      Json      @default("[]")
  status      String    @default("draft")
  publishedAt DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([slug, locale])
}

model Locale {
  code      String   @id
  name      String
  isDefault Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

Generate the client and run migrations:

```bash
bunx prisma generate
bunx prisma migrate dev --name init-cms
```

## How the adapter works

The Prisma adapter implements the `CMSAdapter` interface using Prisma's generated client. It does not import from `@prisma/client` directly - it accepts any object that matches the expected shape. This means:

- You can use a Prisma client from any package in your monorepo
- You avoid version conflicts between the adapter's `@prisma/client` and yours
- The adapter uses structural typing - if your Prisma client exposes `.translationNamespace`, `.page`, and `.locale` with the right methods, it works

## Data shape

**Translations** are stored as `Json` under the composite key `(name, locale)`. The `values` field is `Record<string, string>` - flat dot-notation keys to string values:

```json
{
  "topNav.home": "Home",
  "topNav.about": "About Us",
  "footer.copyright": "© 2025"
}
```

**Pages** store blocks as `Json`. The adapter casts this to `RawBlock[]` - `{ type: string, data: unknown }[]`. Type validation happens in the API layer (Zod schemas in `pagesPlugin`), not in the adapter.

**Locales** are stored as simple rows with `code` as primary key.

## Monorepo usage

Place the Prisma schema in a shared database package (e.g., `packages/db`):

```
packages/
  db/
    schema.prisma
    package.json   ← exports PrismaClient
```

Import and pass the client to the adapter in your API app:

```ts
import { PrismaClient } from "@repo/db";
import { prismaAdapter } from "@modlog/better-cms/prisma";

const prisma = new PrismaClient();
const db = prismaAdapter(prisma);
```


---

[← TanStack Start Adapter](../framework-adapters/tanstack-start.md) | [Drizzle Adapter →](drizzle.md)
