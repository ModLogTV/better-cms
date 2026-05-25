# Plugin System

## How plugins work

Plugins extend `createCMS` at initialization time. They receive a `CMSContext` object and use it to mount Elysia routes, attach event listeners, or extend type inference.

```ts
import type { CMSPlugin } from "@modlog/better-cms";

const myPlugin: CMSPlugin = {
  name: "my-plugin",

  init(ctx) {
    // Mount routes on ctx.elysiaApp
    // Listen to events via ctx.events
    // Access the DB adapter via ctx.adapter
    // Access storage via ctx.storage
  },

  // Optional: extend the cms.$Infer type
  extendInfer(current) {
    return {
      ...current,
      MyCustomType: undefined as unknown as MyType,
    };
  },
};
```

Register plugins in `createCMS`:

```ts
const cms = createCMS({
  // ...
  plugins: [myPlugin],
});
```

Plugins run in order. Each plugin's `init()` is called sequentially.

## CMSContext

```ts
interface CMSContext {
  namespaces: NamespaceDef[];
  adapter: CMSAdapter;        // DB adapter (Prisma, Drizzle, etc.)
  storage?: CMSStorageAdapter; // set by mediaPlugin
  auth: {
    readToken: string;
    adminToken: string;
  };
  events: CMSEventEmitter;    // translation update events
  elysiaApp: ElysiaLike;      // mount routes here
}
```

## CMSPlugin interface

```ts
interface CMSPlugin {
  name: string;
  init(ctx: CMSContext): void | Promise<void>;
  extendInfer?: (current: CMSInfer) => CMSInfer;
}
```

`name` is only used for identification/debugging. Duplicate names are not enforced.

## Events

Plugins can emit and listen to events:

```ts
// Listen
ctx.events.on("translations:updated", ({ namespace, locale, values }) => {
  console.log(`Updated: ${namespace}/${locale}`);
});
```

Currently only one event is emitted:

| Event | Payload | When |
|-------|---------|------|
| `translations:updated` | `{ namespace, locale, values }` | After a successful `PUT /cms/translations/{namespace}/{locale}` |

## Mounting Elysia routes

```ts
import { Elysia } from "elysia";

init(ctx) {
  ctx.elysiaApp.use(
    new Elysia()
      .get("/cms/my-route", () => ({ ok: true }))
  );
}
```

Routes added this way are automatically included by `toElysiaPlugin(cms)`.

## Type inference extension

Plugins can extend `cms.$Infer` to expose types to consumers. The `pagesPlugin` uses this to provide `cms.$Infer.PageBlocks` — a discriminated union of all registered block types:

```ts
type Block = typeof cms.$Infer.PageBlocks;
// { type: "hero"; data: { title: string; subtitle?: string } }
// | { type: "feature-grid"; data: { ... } }
// | ...
```

## Built-in plugins

| Plugin | Import | What it adds |
|--------|--------|-------------|
| `pagesPlugin` | `@modlog/better-cms/plugins/pages` | Page block CRUD routes + type inference |
| `mediaPlugin` | `@modlog/better-cms/plugins/media` | Presigned upload URL route |
| `fallbackPlugin` | `@modlog/better-cms/plugins/fallback` | Writes JSON to disk on translation updates |

See individual plugin docs for full configuration:

- [Pages Plugin](../plugins/pages-plugin.md)
- [Media Plugin](../plugins/media-plugin.md)
- [Fallback Plugin](../plugins/fallback-plugin.md)
- [Fallback Sync Plugin](../plugins/fallback-sync-plugin.md)


---

[← Caching](caching.md) | [Defining Namespaces →](../translations/defining-namespaces.md)
