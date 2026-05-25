# API Reference: Subpath Exports

Complete list of all exports from each subpath.

---

## `@modlog/better-cms`

Core — backend only (Node.js).

| Export | Type | Description |
|--------|------|-------------|
| `createCMS(config)` | function | Initializes the CMS instance |
| `CMSInstance` | type | Return type of `createCMS` |
| `CMSConfig` | type | Input type of `createCMS` |
| `CMSAdapter` | type | Interface for database adapters |
| `CMSPlugin` | type | Interface for plugins |
| `CMSContext` | type | Context passed to plugin `init()` |
| `CMSInfer` | type | Type of `cms.$Infer` |
| `CMSEventEmitter` | class | Event emitter for `translations:updated` |
| `CMSStorageAdapter` | type | Interface for storage adapters |
| `Page` | type | Full page with blocks |
| `PageSummary` | type | Page metadata without blocks |
| `RawBlock` | type | `{ type: string; data: unknown }` |

---

## `@modlog/better-cms/i18n`

Translation utilities — platform neutral.

| Export | Type | Description |
|--------|------|-------------|
| `defineNamespace({ name, definition })` | function | Creates a `NamespaceDef` |
| `key` | constant | Plain string marker |
| `vars<T>()` | function | Interpolated string marker |
| `plural<T>()` | function | Pluralization marker |
| `rich<Tags>()` | function | Rich text marker |
| `createTranslator({ ns, translations, locale })` | function | Returns typed `t()` |
| `createRichTranslator({ ns, translations, locale })` | function | Returns typed `tRich()` |
| `NamespaceDef<T>` | type | `{ name: string; definition: T }` |
| `KeyMarker` | type | Marker type for `key` |
| `VarsMarker<T>` | type | Marker type for `vars<T>()` |
| `PluralMarker<T>` | type | Marker type for `plural<T>()` |
| `RichMarker<Tags>` | type | Marker type for `rich<Tags>()` |
| `TranslatorFn<T>` | type | Type of `t()` |
| `RichTranslatorFn<T>` | type | Type of `tRich()` |

---

## `@modlog/better-cms/client`

Frontend data fetching — platform neutral.

| Export | Type | Description |
|--------|------|-------------|
| `configureCMSClient(config)` | function | Initializes the client singleton |
| `cmsEvents` | constant | Global `CMSEventEmitter` for fetch events |
| `CMSClientConfig` | type | Options: `cmsUrl`, `readToken`, `fallback`, `onFetchStart`, `onFetchSuccess`, `onFetchError` |
| `loadTranslations({ namespace, locale })` | function | Fetches translations (cached) |
| `loadPageContent({ slug, locale })` | function | Fetches page blocks (cached) |
| `getCached<T>(key)` | function | Read from in-memory cache |
| `setCached<T>(key, value, ttlMs)` | function | Write to in-memory cache |
| `deleteCached(key)` | function | Invalidate cache entry |
| `FallbackLoader` | type | `(ns, locale) => Promise<Record<string,string>|null>` |

---

## `@modlog/better-cms/react`

React hooks and provider — browser.

| Export | Type | Description |
|--------|------|-------------|
| `CMSProvider` | component | Context provider for locale + translations |
| `useTranslations(ns)` | hook | Returns `{ t, tRich, isLoading, error }` |
| `usePageContent(slug)` | hook | Returns `{ data, isLoading, error }` |
| `useLocale()` | hook | Returns `{ locale, setLocale }` |
| `useCMSClientEvents(ev, fn)` | hook | Subscribes to client-side events |

---

## `@modlog/better-cms/elysia`

Elysia integration — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `toElysiaPlugin(cms)` | function | Mounts all CMS routes on Elysia |

---

## `@modlog/better-cms/next`

Next.js integration — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `toNextHandler(handle)` | function | Wraps Elysia handle as Next.js route exports |
| `createNextProxy(opts)` | function | Locale detection + redirect proxy |
| `NextProxyOptions` | type | Options for `createNextProxy` |

---

## `@modlog/better-cms/tanstack-start`

TanStack Start integration — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `createServerFns(admin)` | function | Returns plain async wrappers for server functions |

---

## `@modlog/better-cms/prisma`

Prisma database adapter — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `prismaAdapter(prismaClient)` | function | Returns `CMSAdapter` implementation |

---

## `@modlog/better-cms/admin`

Admin client — Node.js / server-side only.

| Export | Type | Description |
|--------|------|-------------|
| `createAdminClient(opts)` | function | Returns typed `AdminClient` |
| `CMSError` | class | Thrown on non-2xx API responses |
| `AdminClient` | type | Interface with namespaces/pages/media/locales |
| `KeyMetadata` | type | Per-key metadata from `describe` |
| `KeyType` | type | `"key" | "vars" | "plural" | "rich"` |
| `InputHint` | type | `"text" | "text+vars" | "text+count" | "rich-text"` |
| `NamespaceSummary` | type | `{ name: string }` |

---

## `@modlog/better-cms/admin/react`

Admin React hooks — browser.

| Export | Type | Description |
|--------|------|-------------|
| `createAdminHooks(admin)` | function | Returns all admin hooks |
| `AdminQueryProvider` | component | TanStack Query provider for admin |

---

## `@modlog/better-cms/plugins/pages`

Pages plugin — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `pagesPlugin(opts?)` | function | Returns `CMSPlugin` |
| `PageBlock` | type | `{ type: string; schema: ZodSchema }` |
| `BlockDefinition` | type | Alias for `PageBlock` |
| `BlockUnion<Defs>` | type | Discriminated union of all registered block types |
| `InferBlockData<T>` | type | Infers `data` type from a `BlockDefinition` |

---

## `@modlog/better-cms/plugins/media`

Media plugin — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `mediaPlugin(opts)` | function | Returns `CMSPlugin` |

---

## `@modlog/better-cms/plugins/fallback`

Fallback plugin — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `fallbackPlugin(opts)` | function | Returns `CMSPlugin` |

---

## `@modlog/better-cms/plugins/fallback-sync`

Fallback sync — Node.js.

| Export | Type | Description |
|--------|------|-------------|
| `startFallbackSync(opts)` | function | Async: syncs + starts polling |

---

## Storage adapters

### `@modlog/better-cms/storage/aws`
| Export | Description |
|--------|-------------|
| `awsS3Adapter(opts)` | AWS S3 storage adapter |

### `@modlog/better-cms/storage/r2`
| Export | Description |
|--------|-------------|
| `cloudflareR2Adapter(opts)` | Cloudflare R2 storage adapter |

### `@modlog/better-cms/storage/hetzner`
| Export | Description |
|--------|-------------|
| `hetznerS3Adapter(opts)` | Hetzner Object Storage adapter |

### `@modlog/better-cms/storage/local`
| Export | Description |
|--------|-------------|
| `localStorageAdapter(opts)` | Local filesystem adapter (dev only) |


---

[← Building an Admin UI](../admin/building-admin-ui.md)
