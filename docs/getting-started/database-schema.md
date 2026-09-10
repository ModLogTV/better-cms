# Database Schema

- [Prisma](#prisma)
  - [Core CMS models](#core-cms-models)
  - [Media model (required when using `mediaPlugin`)](#media-model-required-when-using-mediaplugin)
  - [Auth models (required when using `betterAuthCMSAdapter`)](#auth-models-required-when-using-betterauthcmsadapter)
  - [Model notes](#model-notes)
- [Running migrations](#running-migrations)
- [Schema placement in a monorepo](#schema-placement-in-a-monorepo)
- [Drizzle](#drizzle)

## Prisma

Copy these models into your `schema.prisma`. The Prisma adapter expects these exact model and field names.

### Core CMS models

```prisma
model TranslationNamespace {
  name      String
  locale    String
  values    Json     @default("{}")
  updatedAt DateTime @updatedAt

  @@id([name, locale])
}

// Locale-independent tree identity: slug/path/parentId live here, not per-locale.
model PageNode {
  id       String  @id @default(cuid())
  parentId String?
  slug     String
  // Materialized full path (ancestor slugs joined by "/"). Root nodes: path == slug.
  path     String

  parent   PageNode?     @relation("PageTree", fields: [parentId], references: [id], onDelete: Cascade)
  children PageNode[]    @relation("PageTree")
  contents PageContent[]
  grants   PageGrant[]

  // Slug uniqueness is scoped to the parent, not global.
  @@unique([parentId, slug])
  @@unique([path])
  @@index([parentId])
}

// ACL grant scoping a user/group to a permission on a node (and, by
// inheritance, its subtree). Additive-only - no deny/inheritance-break.
// `locale: null` applies to all locales of the node.
model PageGrant {
  id          String   @id @default(cuid())
  nodeId      String
  subjectType String
  subjectId   String
  permission  String
  locale      String?
  createdAt   DateTime @default(now())

  node PageNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@index([nodeId])
  @@index([subjectType, subjectId])
}

// One row per (node, locale) - a page can exist for a single locale without
// any of the other locales existing yet. Each locale has its own independent
// draft/published lifecycle.
model PageContent {
  id                 String   @id
  nodeId             String
  locale             String
  // Points at the PageVersion currently live. Status is derived, not stored:
  // no pointer = draft; pointer == latest version = published; pointer !=
  // latest version = published with unpublished changes.
  publishedVersionId String?
  updatedAt          DateTime @updatedAt

  node     PageNode      @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  versions PageVersion[]

  @@unique([nodeId, locale])
  @@index([nodeId])
}

// Append-only. One row per Save and per Publish (publish reuses the latest
// version when it's still the current draft).
model PageVersion {
  // `seq` (not `id`) is the real primary key - a plain autoincrement int is
  // the only way SQLite guarantees a stable creation order, since two
  // versions created within the same millisecond otherwise sort
  // nondeterministically by `createdAt` alone. `id` is still what every
  // other model/route references externally.
  seq         Int       @id @default(autoincrement())
  id          String    @unique @default(cuid())
  contentId   String
  blocks      Json      @default("[]")
  createdAt   DateTime  @default(now())
  publishedAt DateTime?
  createdBy   String?

  content PageContent @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@index([contentId])
}

model Locale {
  code      String   @id
  name      String
  isDefault Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

### Media model (required when using `mediaPlugin`)

```prisma
model MediaAsset {
  id                 String    @id @default(cuid())
  uploadedBy         String?
  confirmedAt        DateTime?
  createdAt          DateTime  @default(now())
  // Points at the MediaVersion currently live - same derived-status pattern
  // as PageContent.publishedVersionId.
  publishedVersionId String?

  versions MediaVersion[]
}

// Append-only. One row per metadata edit and per file replacement (the
// current key/filename/mimeType/size/publicUrl live here, not on MediaAsset).
model MediaVersion {
  // See PageVersion.seq - same nondeterministic-same-millisecond-sort issue.
  seq         Int       @id @default(autoincrement())
  id          String    @unique @default(cuid())
  assetId     String
  // Not @unique - a metadata-only edit (no file replacement) reuses the
  // previous version's key, so it legitimately repeats across an asset's own
  // history. Looked up via findFirst, not findUnique.
  key         String
  filename    String
  mimeType    String
  size        Int
  publicUrl   String
  // alt/caption/custom key-value fields + extracted width/height/duration.
  metadata    Json  // no @default - see the Model notes section
  createdAt   DateTime  @default(now())
  publishedAt DateTime?
  createdBy   String?

  asset MediaAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@index([key])
}
```

### Auth models (required when using `betterAuthCMSAdapter`)

Add these models **and extend the better-auth `user` model** with CMS permission fields:

```prisma
// Extend the better-auth user table - add these fields
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
- Composite primary key `[name, locale]` - one row per namespace + locale combination.
- `values` stores the raw key→value map as JSON. Keys are flat strings (e.g. `"topNav.aboutUs"`).
- `updatedAt` tracks the last write to this namespace+locale - powers the admin dashboard's "recently updated" list.

**`Page`**
- `id` is a string you control - typically a UUID generated on create.
- `slug` + `locale` must be unique together.
- `blocks` is a JSON array of `{ type: string, data: unknown }` objects. The `pagesPlugin` validates `data` against your registered Zod schemas on write.
- `status` is either `"draft"` or `"published"`.

**`Locale`**
- Locales are managed dynamically through the CMS API, not hardcoded in code.
- `isDefault` marks the locale used when no locale preference is detected.
- Only one locale should have `isDefault: true` - the adapter does not enforce this constraint.

**`CmsGroup`**
- Groups are created by developers or admin users via the CMS API.
- `permissions` is a string array of `CMSPermission` values (e.g. `["cms:translations:read", "cms:pages:write"]`).
- See [Permission Reference](../auth/permissions-reference.md) for all valid permission strings.

**`CmsUserGroup`**
- Join table between users and groups.
- Composite primary key `[userId, groupId]` - unique membership per user/group pair.
- `onDelete: Cascade` - group deletion removes all memberships.

## Running migrations

```bash
bunx prisma migrate dev --name init-cms
```

## Schema placement in a monorepo

Place the schema in your shared database package (e.g., `packages/db/schema.prisma`). The Prisma adapter accepts any object matching the `PrismaClient` shape - it does not import `@prisma/client` directly, so you can pass a client from any package without version conflicts.

## Drizzle

Drizzle support is **not yet implemented**. The `@modlog/better-cms/drizzle` export is a stub. See [Drizzle adapter docs](../database-adapters/drizzle.md) for the current status.


---

[← Quick Start](quick-start.md) | [Architecture →](../core-concepts/architecture.md)
