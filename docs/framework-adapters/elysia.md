# Elysia Adapter

- [Mounting routes](#mounting-routes)
- [Routes mounted](#routes-mounted)
- [Authentication](#authentication)
- [Custom prefix](#custom-prefix)
- [Combining with other Elysia plugins](#combining-with-other-elysia-plugins)

## Mounting routes

```ts
import { Elysia } from "elysia";
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { cms } from "./cms";

const app = new Elysia()
  .use(toElysiaPlugin(cms))
  .listen(3001);
```

`toElysiaPlugin(cms)` returns an Elysia instance with a `/cms` prefix, containing:

- Translation read routes (always included)
- Admin routes (always included)
- Plugin-specific routes (added by plugins in `createCMS`)

## Routes mounted

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cms/translations/:namespace/:locale` | Read translations |
| `PUT` | `/cms/translations/:namespace/:locale` | Write translations |
| `GET` | `/cms/admin/namespaces` | List namespaces |
| `GET` | `/cms/admin/namespaces/:name/describe` | Describe namespace keys |
| `GET` | `/cms/admin/locales` | List locales |
| `PUT` | `/cms/admin/locales` | Upsert locale |
| `DELETE` | `/cms/admin/locales/:code` | Delete locale |
| `GET` | `/cms/pages` | List pages _(pagesPlugin required)_ |
| `GET` | `/cms/pages/:slug` | Get page by slug _(pagesPlugin required)_ |
| `PUT` | `/cms/pages/:id` | Update page blocks _(pagesPlugin required)_ |
| `POST` | `/cms/pages/:id/publish` | Publish page _(pagesPlugin required)_ |
| `POST` | `/cms/media/presign` | Generate upload URL _(mediaPlugin required)_ |

## Authentication

All routes require the `x-internal-token` header. The token value must match either the `readToken` or `adminToken` configured in your `createCMS` instance:

- **`readToken`**: Required for translation read routes and single page content requests.
- **`adminToken`**: Required for all administrative write operations, listing pages, and media uploads.

Requests without a valid token for the given route receive `401 Unauthorized`.

## Custom prefix

`toElysiaPlugin` uses `/cms` prefix. To change it, wrap the plugin and re-apply a prefix on your Elysia instance:

```ts
// Not directly supported — use Elysia's group() if you need a different prefix
const app = new Elysia()
  .group("/api", (app) => app.use(toElysiaPlugin(cms)))
  .listen(3001);
```

Note: if you change the prefix, update `cmsUrl` in `configureCMSClient` and `createAdminClient` accordingly.

## Combining with other Elysia plugins

```ts
import { Elysia } from "elysia";
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { cors } from "@elysiajs/cors";
import { cms } from "./cms";

const app = new Elysia()
  .use(cors())
  .use(toElysiaPlugin(cms))
  .get("/health", () => ({ ok: true }))
  .listen(3001);
```


---

[← Using Page Content](../pages/using-page-content.md) | [Next.js Adapter →](next.md)
