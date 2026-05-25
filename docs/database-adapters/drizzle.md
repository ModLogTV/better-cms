# Drizzle Adapter

> **Status: Not yet implemented.**

The `@modlog/better-cms/drizzle` export is currently a stub. The import resolves but the adapter is not functional.

## Planned API

The Drizzle adapter will follow the same pattern as `prismaAdapter`:

```ts
import { drizzleAdapter } from "@modlog/better-cms/drizzle";
import { db } from "@repo/db"; // your drizzle instance

const cms = createCMS({
  database: drizzleAdapter(db),
  // ...
});
```

## Contributing

If you need Drizzle support, the adapter must implement the `CMSAdapter` interface from `@modlog/better-cms`:

```ts
interface CMSAdapter {
  getTranslations(namespace: string, locale: string): Promise<Record<string, string>>;
  upsertTranslations(namespace: string, locale: string, values: Record<string, string>): Promise<void>;
  getPage(slug: string, locale: string, draft: boolean): Promise<Page | null>;
  upsertPage(id: string, blocks: RawBlock[]): Promise<void>;
  publishPage(id: string): Promise<void>;
  listPages(): Promise<PageSummary[]>;
  listLocales(): Promise<Locale[]>;
  upsertLocale(code: string, name: string, isDefault?: boolean): Promise<void>;
  deleteLocale(code: string): Promise<void>;
}
```

The Prisma adapter in `src/prisma/index.ts` is the reference implementation.

## Workaround

Until the Drizzle adapter is implemented, you can write a custom adapter that wraps your Drizzle queries and satisfies the `CMSAdapter` interface:

```ts
import type { CMSAdapter } from "@modlog/better-cms";
import { db } from "@repo/db";
import { translationNamespaces, pages, locales } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export const drizzleCMSAdapter: CMSAdapter = {
  async getTranslations(namespace, locale) {
    const row = await db.query.translationNamespaces.findFirst({
      where: and(
        eq(translationNamespaces.name, namespace),
        eq(translationNamespaces.locale, locale),
      ),
    });
    return (row?.values as Record<string, string>) ?? {};
  },
  // ... implement remaining methods
};
```


---

[← Prisma Adapter](prisma.md) | [Storage Adapters →](../storage-adapters/overview.md)
