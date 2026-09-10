# Permission Reference

- [Permission strings](#permission-strings)
- [Wildcard](#wildcard)
- [All permissions array](#all-permissions-array)
- [Type](#type)
- [Utilities](#utilities)

All CMS permission strings are exported from `better-cms/auth` as the `CMS_PERMISSIONS` const object and the `CMSPermission` TypeScript type.

```ts
import { CMS_PERMISSIONS } from "better-cms/auth"
import type { CMSPermission } from "better-cms/auth"
```

## Permission strings

| Constant | Value | Grants access to |
|---|---|---|
| `TRANSLATIONS_READ` | `cms:translations:read` | `GET /cms/translations/:ns/:locale` |
| `TRANSLATIONS_WRITE` | `cms:translations:write` | `PUT /cms/translations/:ns/:locale` |
| `LOCALES_READ` | `cms:locales:read` | `GET /cms/admin/locales` |
| `LOCALES_WRITE` | `cms:locales:write` | `PUT /cms/admin/locales` |
| `LOCALES_DELETE` | `cms:locales:delete` | `DELETE /cms/admin/locales/:code` |
| `PAGES_READ` | `cms:pages:read` | `GET /cms/pages`, `GET /cms/pages/:slug` |
| `PAGES_WRITE` | `cms:pages:write` | `PUT /cms/pages/:id` |
| `PAGES_PUBLISH` | `cms:pages:publish` | `POST /cms/pages/:id/publish` |
| `MEDIA_UPLOAD` | `cms:media:upload` | `POST /cms/media/presign` |
| `MEDIA_DELETE` | `cms:media:delete` | `DELETE /cms/media/:key` |
| `ADMIN_READ` | `cms:admin:read` | `GET /cms/admin/namespaces`, `GET /cms/admin/namespaces/:ns/describe` |
| `USERS_MANAGE` | `cms:users:manage` | All `/cms/admin/users/*` routes |
| `GROUPS_MANAGE` | `cms:groups:manage` | All `/cms/admin/groups/*` routes |

## Wildcard

The string `"cms:*"` grants every permission above. Assign it to super-admins.

```ts
import { CMS_WILDCARD_PERMISSION } from "better-cms/auth"
// "cms:*"
```

## All permissions array

```ts
import { ALL_CMS_PERMISSIONS } from "better-cms/auth"
// Array of every CMSPermission value (excludes the wildcard)
```

Useful for seeding a group with all permissions or building a permission picker UI.

## Type

`CMSPermission` is a union of all permission string literals:

```ts
type CMSPermission =
  | "cms:translations:read"
  | "cms:translations:write"
  | "cms:locales:read"
  | "cms:locales:write"
  | "cms:locales:delete"
  | "cms:pages:read"
  | "cms:pages:write"
  | "cms:pages:publish"
  | "cms:media:upload"
  | "cms:media:delete"
  | "cms:admin:read"
  | "cms:users:manage"
  | "cms:groups:manage"
```

Permission strings in the database are stored as plain strings (not validated by the DB). The type is enforced at the TypeScript layer.

## Utilities

```ts
import {
  hasPermission,       // (userPerms: string[], required: CMSPermission) => boolean
  hasAllPermissions,   // (userPerms: string[], required: CMSPermission[]) => boolean
  hasAnyPermission,    // (userPerms: string[], required: CMSPermission[]) => boolean
} from "better-cms/auth"
```

The `"cms:*"` wildcard is always checked first - a user with `["cms:*"]` satisfies every `hasPermission` call.

---

[← Custom adapter](./custom-adapter.md) | [Auth overview →](./index.md)
