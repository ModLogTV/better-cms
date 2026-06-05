# better-auth Integration

- [Installation](#installation)
- [Setup](#setup)
  - [1. Add schema models](#1-add-schema-models)
  - [2. Create the adapter](#2-create-the-adapter)
  - [3. Mount on Elysia](#3-mount-on-elysia)
- [How permissions work](#how-permissions-work)
- [Service token (frontend reads)](#service-token-frontend-reads)
- [Managing users and groups](#managing-users-and-groups)

`betterAuthCMSAdapter` connects better-auth sessions to the CMS permission system. Users are authenticated via better-auth; their CMS permissions come from `cmsPermissions` on the user record and any `CmsGroup` memberships.

## Installation

```bash
bun add better-auth
```

better-auth is an optional peer dependency. Install it only if you use `betterAuthCMSAdapter`.

## Setup

### 1. Add schema models

Extend your `schema.prisma` with the CMS auth models. Add two fields to the better-auth `user` model and two new models:

```prisma
model user {
  id            String   @id
  name          String
  email         String   @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime

  // CMS fields
  cmsPermissions String[]
  cmsGroups      CmsUserGroup[]

  sessions Session[]
  accounts Account[]

  @@map("user")
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

Tell better-auth about the extra fields:

```ts
// lib/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./db"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      cmsPermissions: {
        type: "string[]",
        defaultValue: [],
      },
    },
  },
})
```

Run migrations:

```bash
bunx prisma migrate dev --name add-cms-auth
```

### 2. Create the adapter

```ts
// cms.ts
import { createCMS } from "better-cms"
import { betterAuthCMSAdapter } from "better-cms/better-auth"
import { prismaAdapter } from "better-cms/prisma"
import { auth } from "./lib/auth"
import { prisma } from "./lib/db"
import { namespaces } from "@repo/cms-config"

export const cms = createCMS({
  database: prismaAdapter(prisma),
  namespaces,
  auth: betterAuthCMSAdapter({
    auth,
    prisma,
    // Optional: allow frontend services to read translations without a session
    serviceToken: process.env.CMS_SERVICE_TOKEN,
  }),
  initialAdminUser: {
    email: process.env.CMS_ADMIN_EMAIL!,
    name: "Admin",
    password: process.env.CMS_ADMIN_PASSWORD!,
  },
})
```

### 3. Mount on Elysia

```ts
// api/index.ts
import { Elysia } from "elysia"
import { toElysiaPlugin } from "better-cms/elysia"
import { auth } from "./lib/auth"
import { cms } from "./cms"

const app = new Elysia()
  .mount("/api/auth", auth.handler)
  .use(toElysiaPlugin(cms))
  .listen(3000)
```

## How permissions work

When a request hits a protected route:

1. The adapter checks for a service token (`x-cms-token` or `x-internal-token` header).
2. If none, it calls `auth.api.getSession({ headers })` to resolve the user.
3. The user's `cmsPermissions` (direct) are merged with all their group permissions.
4. The merged set is checked against the required route permission.

## Service token (frontend reads)

For server-side rendering (Next.js RSC, `instrumentation.ts`), configure a service token:

```ts
// Frontend: configureCMSClient (Next.js layout.tsx)
configureCMSClient({
  cmsUrl: process.env.CMS_URL!,
  readToken: process.env.CMS_SERVICE_TOKEN!, // same value as serviceToken above
})
```

The service token grants: `translations:read`, `locales:read`, `pages:read`, `admin:read`.

## Managing users and groups

With `betterAuthCMSAdapter`, `auth.management` is automatically populated. The following admin routes become available (requires `cms:users:manage` or `cms:groups:manage`):

```ts
// Assign permissions directly to a user
PUT /cms/admin/users/:userId/permissions
{ "permissions": ["cms:translations:read", "cms:pages:write"] }

// Create a group
POST /cms/admin/groups
{ "name": "Editors", "permissions": ["cms:translations:write", "cms:pages:write"] }

// Add user to group
POST /cms/admin/users/:userId/groups
{ "groupId": "<group-id>" }
```

See the [Admin API reference](../auth/index.md#admin-api-routes) for the full route list.

---

[← Auth overview](./index.md) | [Custom adapter →](./custom-adapter.md)
