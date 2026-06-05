# Database Schema

## Prisma

Copy these models into your `schema.prisma`. The Prisma adapter expects these exact model and field names.

### Core CMS models

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

### Auth models (required when using `betterAuthCMSAdapter`)

Add these models **and extend the better-auth `user` model** with CMS permission fields:

```prisma
// Extend the better-auth user table — add these fields
model user {
  // ... existing better-auth fields ...

  cmsPermissions String[]       // direct per-user permissions (e.g. ["cms:*"])
  cmsGroups      CmsUserGroup[]
}

model CmsGroup {
  id          String         @id @default(cuid())
  name        String         @unique
  permissions String[]
  userGroups  CmsUserGroup[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model CmsUserGroup {
  userId  String
  groupId String
  group   CmsGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([userId, groupId])
}
```

> **Note:** better-auth generates its own `user` model. Use better-auth's [additional fields](https://www.better-auth.com/docs/concepts/database#additional-fields) feature to add `cmsPermissions` and the `cmsGroups` relation. See the [auth docs](../auth/better-auth.md) for a full example.

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

**`CmsGroup`**
- Groups are created by developers or admin users via the CMS API.
- `permissions` is a string array of `CMSPermission` values (e.g. `["cms:translations:read", "cms:pages:write"]`).
- See [Permission Reference](../auth/permissions-reference.md) for all valid permission strings.

**`CmsUserGroup`**
- Join table between users and groups.
- Composite primary key `[userId, groupId]` — unique membership per user/group pair.
- `onDelete: Cascade` — group deletion removes all memberships.

## Running migrations

```bash
bunx prisma migrate dev --name init-cms
```

## Schema placement in a monorepo

Place the schema in your shared database package (e.g., `packages/db/schema.prisma`). The Prisma adapter accepts any object matching the `PrismaClient` shape — it does not import `@prisma/client` directly, so you can pass a client from any package without version conflicts.

## Drizzle

Drizzle support is **not yet implemented**. The `@modlog/better-cms/drizzle` export is a stub. See [Drizzle adapter docs](../database-adapters/drizzle.md) for the current status.


---

[← Quick Start](quick-start.md) | [Architecture →](../core-concepts/architecture.md)
