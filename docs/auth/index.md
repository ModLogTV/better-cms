# Authentication & Authorization

- [Adapters](#adapters)
- [Permissions](#permissions)
  - [Wildcard](#wildcard)
  - [Groups](#groups)
- [Initial admin user](#initial-admin-user)
- [Admin API routes](#admin-api-routes)

better-cms uses a **framework-agnostic auth adapter** pattern. Every protected API route calls `auth.verifyRequest(headers)` and receives a list of permission strings. You choose the adapter; the CMS doesn't care how users are authenticated.

## Adapters

| Adapter | When to use |
|---|---|
| [`tokenAuthAdapter`](./token-adapter.md) | Simple token-based auth, CI scripts, no user accounts needed |
| [`betterAuthCMSAdapter`](./better-auth.md) | Full user auth with sessions, roles, and the admin dashboard |
| [Custom adapter](./custom-adapter.md) | Any other auth system (Auth.js, Clerk, Lucia, etc.) |

## Permissions

Access control is **permission-based**. Each endpoint requires one or more named permissions. Permissions are hard-coded strings exposed from `better-cms/auth`:

```ts
import { CMS_PERMISSIONS, ALL_CMS_PERMISSIONS } from "better-cms/auth"

// e.g. "cms:translations:read", "cms:locales:write", ...
```

See the [Permission Reference](./permissions-reference.md) for the full list.

### Wildcard

The string `"cms:*"` grants every permission. Assign it to admin users.

### Groups

Users can belong to **groups**. A group has a name and a `permissions` array. User permissions are the union of their direct permissions and all their groups' permissions.

Group management is exposed via the admin API when `auth.management` is defined (automatically provided by `betterAuthCMSAdapter`).

## Initial admin user

Pass `initialAdminUser` to `createCMS()` to automatically create (or upsert) a wildcard admin user on startup:

```ts
const cms = createCMS({
  auth: betterAuthCMSAdapter({ auth, prisma }),
  initialAdminUser: {
    email: "admin@example.com",
    name: "Admin",
    password: process.env.ADMIN_PASSWORD!,
  },
})
```

The admin user is created only if the auth adapter implements `upsertAdminUser` (all built-in adapters do). `tokenAuthAdapter` does not support `initialAdminUser` and will print a warning if one is set.

## Admin API routes

When `auth.management` is present, the following routes are registered automatically:

| Method | Path | Permission required |
|---|---|---|
| GET | `/cms/admin/users` | `cms:users:manage` |
| GET | `/cms/admin/users/:id/permissions` | `cms:users:manage` |
| PUT | `/cms/admin/users/:id/permissions` | `cms:users:manage` |
| GET | `/cms/admin/users/:id/groups` | `cms:users:manage` |
| POST | `/cms/admin/users/:id/groups` | `cms:users:manage` |
| DELETE | `/cms/admin/users/:id/groups/:groupId` | `cms:users:manage` |
| GET | `/cms/admin/groups` | `cms:groups:manage` |
| POST | `/cms/admin/groups` | `cms:groups:manage` |
| PUT | `/cms/admin/groups/:id` | `cms:groups:manage` |
| DELETE | `/cms/admin/groups/:id` | `cms:groups:manage` |

---

[← Core Concepts](../core-concepts/architecture.md) | [better-auth →](./better-auth.md)
