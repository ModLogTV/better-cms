# Database Schema

## Prisma

Copy these models into your `schema.prisma`. The Prisma adapter expects these exact model and field names.

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

### Model notes

**`TranslationNamespace`**
- Composite primary key `[name, locale]` — one row per namespace + locale combination.
- `values` stores the raw key→value map as JSON. Keys are flat strings (e.g. `"topNav.aboutUs"`).

**`Page`**
- `id` is a string you control — typically a UUID generated on create.
- `slug` + `locale` must be unique together.
- `blocks` is a JSON array of `{ type: string, data: unknown }` objects. The `pagesPlugin` validates `data` against your registered Zod schemas on write.
- `status` is either `"draft"` or `"published"`.

**`Locale`**
- Locales are managed dynamically through the CMS API, not hardcoded in code.
- `isDefault` marks the locale used when no locale preference is detected.
- Only one locale should have `isDefault: true` — the adapter does not enforce this constraint.

## Running migrations

```bash
bunx prisma migrate dev --name init-cms
```

## Schema placement in a monorepo

Place the schema in your shared database package (e.g., `packages/db/schema.prisma`). The Prisma adapter accepts any object matching the `PrismaClient` shape — it does not import `@prisma/client` directly, so you can pass a client from any package without version conflicts.

## Drizzle

Drizzle support is **not yet implemented**. The `@modlog/better-cms/drizzle` export is a stub. See [Drizzle adapter docs](../database-adapters/drizzle.md) for the current status.
