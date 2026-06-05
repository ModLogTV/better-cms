# Custom Auth Adapter

- [Interface](#interface)
- [Example: Clerk](#example-clerk)
- [`CMSAuthResult` shape](#cmsauthresult-shape)
- [Permission utilities](#permission-utilities)

Implement `CMSAuthAdapter` from `better-cms/auth` to integrate any auth system (Auth.js, Clerk, Lucia, Supabase Auth, etc.).

## Interface

```ts
import type { CMSAuthAdapter, CMSAuthResult } from "better-cms/auth"

const myAdapter: CMSAuthAdapter = {
  async verifyRequest(headers): Promise<CMSAuthResult> {
    // Inspect headers, resolve the caller, return permissions.
    // Return { authorized: false, permissions: [] } for anonymous/invalid.
  },

  // Optional: called by createCMS() when initialAdminUser is set.
  async upsertAdminUser(user): Promise<void> {
    // Create user in your auth system and grant cms:* permission.
  },

  // Optional: expose user/group CRUD for the admin dashboard.
  management: {
    listUsers: async () => [...],
    getUserPermissions: async (userId) => [...],
    setUserPermissions: async (userId, permissions) => { ... },
    getUserGroups: async (userId) => [...],
    addUserToGroup: async (userId, groupId) => { ... },
    removeUserFromGroup: async (userId, groupId) => { ... },
    listGroups: async () => [...],
    createGroup: async ({ name, permissions }) => ({ id, name, permissions }),
    updateGroup: async (id, opts) => ({ id, name, permissions }),
    deleteGroup: async (id) => { ... },
  },
}
```

## Example: Clerk

```ts
import { createClerkClient } from "@clerk/backend"
import type { CMSAuthAdapter } from "better-cms/auth"
import { CMS_PERMISSIONS, hasPermission } from "better-cms/auth"

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

export function clerkCMSAdapter(): CMSAuthAdapter {
  return {
    async verifyRequest(headers) {
      const sessionToken = headers["authorization"]?.replace("Bearer ", "")
      if (!sessionToken) return { authorized: false, permissions: [] }

      try {
        const session = await clerk.sessions.verifySession(sessionToken, sessionToken)
        const user = await clerk.users.getUser(session.userId)
        const permissions = (user.publicMetadata.cmsPermissions as string[]) ?? []
        return { authorized: true, permissions, userId: session.userId }
      } catch {
        return { authorized: false, permissions: [] }
      }
    },
  }
}
```

## `CMSAuthResult` shape

```ts
interface CMSAuthResult {
  authorized: boolean    // false → 401; true with missing perm → 403
  permissions: string[]  // CMS permission strings or "cms:*" wildcard
  userId?: string        // optional, passed to handler context as cmsUserId
}
```

## Permission utilities

```ts
import {
  hasPermission,       // single check
  hasAllPermissions,   // all must match
  hasAnyPermission,    // at least one must match
  CMS_PERMISSIONS,     // const object of all permission strings
  ALL_CMS_PERMISSIONS, // array of all permissions (useful for admin seeding)
  CMS_WILDCARD_PERMISSION, // "cms:*"
} from "better-cms/auth"
```

---

[← better-auth](./better-auth.md) | [Permission Reference →](./permissions-reference.md)
