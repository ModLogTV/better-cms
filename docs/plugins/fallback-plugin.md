# Fallback Plugin

Writes translation snapshots to the local filesystem on every update. Used by the frontend's `fallback` loader to serve content when the CMS API is unreachable.

## When to use this plugin

Use `fallbackPlugin` when your CMS API and frontend share a disk — i.e., the same container or the same monorepo on the same machine. If they run in separate containers, use [Fallback Sync Plugin](./fallback-sync-plugin.md) instead.

## Registration

```ts
import { fallbackPlugin } from "@modlog/better-cms/plugins/fallback";
import { join } from "node:path";

const cms = createCMS({
  // ...
  plugins: [
    fallbackPlugin({
      outputDir: join(__dirname, "../../../apps/web/locales"),
    }),
  ],
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `outputDir` | `string` | Absolute path to write JSON files |

## File structure

```
{outputDir}/
  en/
    common.json
    dashboard.json
  de/
    common.json
    dashboard.json
```

Each file contains the raw key→value map:

```json
{
  "submit": "Submit",
  "greeting": "Hello, {name}!",
  "itemCount_one": "One item",
  "itemCount_other": "{count} items"
}
```

## How it works

The plugin listens to the `translations:updated` event, which fires after every successful `PUT /cms/translations/:namespace/:locale` request. On each event:

1. Creates `{outputDir}/{locale}/` if it doesn't exist (`mkdir -p`)
2. Writes `{namespace}.json` with the full translations object

## Wiring the fallback loader

In your frontend, configure the CMS client to import from the same directory:

```ts
configureCMSClient({
  cmsUrl: "...",
  readToken: "...",
  fallback: async (namespace, locale) => {
    try {
      return (await import(`./locales/${locale}/${namespace}.json`)).default;
    } catch {
      return null;
    }
  },
});
```

The dynamic `import()` path must match `outputDir` relative to where the `cms-client.ts` file lives. Bundlers resolve these paths statically — the files must exist at build time for bundler-based dynamic imports to work.

## Limitations

- Files are only written when a translation is **updated** via the API. If the database has content but no update has been made since deployment, the files won't exist yet.
- For initial population of fallback files on first deploy, run a manual sync or use `fallbackSyncPlugin` for the first boot.
- Only the API process can write to `outputDir`. The frontend process must have read access to the same path.


---

[← Media Plugin](media-plugin.md) | [Fallback Sync Plugin →](fallback-sync-plugin.md)
