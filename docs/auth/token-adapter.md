# Token Auth Adapter

`tokenAuthAdapter` is the simplest auth adapter. It authenticates requests using static bearer tokens — no user accounts, no sessions.

Use it when:
- You control all callers (internal services, CI scripts)
- You don't need per-user audit trails
- You're migrating from the old `auth: { readToken, adminToken }` config

## Usage

```ts
import { createCMS } from "better-cms"
import { tokenAuthAdapter } from "better-cms/auth"

const cms = createCMS({
  auth: tokenAuthAdapter({
    readToken: process.env.CMS_READ_TOKEN!,
    adminToken: process.env.CMS_ADMIN_TOKEN!,
  }),
})
```

## Behavior

| Token sent | Permissions granted |
|---|---|
| `adminToken` | `cms:*` (all permissions) |
| `readToken` | `translations:read`, `locales:read`, `pages:read`, `admin:read` |
| Wrong / missing | `401 Unauthorized` |

Tokens are accepted via:
- `x-cms-token` header (preferred)
- `x-internal-token` header (legacy, backward compat)

## Limitations

- No `upsertAdminUser` support — `initialAdminUser` will be ignored with a warning.
- No `management` interface — user/group admin routes will not be registered.

---

[← Auth overview](./index.md) | [Custom adapter →](./custom-adapter.md)
