# Defining Namespaces

- [The shared config package pattern](#the-shared-config-package-pattern)
- [defineNamespace](#definenamespace)
- [Marker reference](#marker-reference)
  - [`key` — static string](#key-static-string)
  - [`vars<T>()` — interpolated string](#varst-interpolated-string)
  - [`plural<T>()` — count-based pluralization](#pluralt-count-based-pluralization)
  - [`rich<Tags>()` — JSX rich text](#richtags-jsx-rich-text)
- [Nested keys](#nested-keys)
- [Registering namespaces](#registering-namespaces)
- [Describing a namespace](#describing-a-namespace)

## The shared config package pattern

All namespace definitions must live in a package shared between your API and frontend apps. If you define namespaces in two places, TypeScript cannot guarantee that the keys you use in your UI actually exist in the database.

```
packages/cms-config/index.ts  ← single source of truth
apps/api/                      ← imports from @repo/cms-config
apps/web/                      ← imports from @repo/cms-config
```

## defineNamespace

```ts
import { defineNamespace } from "@modlog/better-cms/i18n";

export const ns = defineNamespace({ name, definition });
```

- `name`: unique string identifier — used in API URLs and fallback file paths
- `definition`: object of key → marker mappings (may be nested)

Returns a `NamespaceDef<T>` — an object with `.name` and `.definition`. Pass this directly to `useTranslations`, `createTranslator`, and `ALL_NAMESPACES`.

## Marker reference

### `key` — static string

```ts
import { key } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "ui",
  definition: {
    submitButton: key,
    cancelButton: key,
  },
});
```

`t("submitButton")` → `string`. No variables. DB value: `"Submit"`.

### `vars<T>()` — interpolated string

```ts
import { vars } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "ui",
  definition: {
    greeting: vars<{ name: string }>(),
    priceLabel: vars<{ price: number; currency: string }>(),
  },
});
```

`t("greeting", { name: "Alice" })` → `string`.

DB value: `"Hello, {name}!"` — variables wrapped in `{curly braces}`.

TypeScript will error if you pass wrong or missing variables:

```ts
t("greeting")                    // ✗ TS error: missing vars
t("greeting", { name: 42 })      // ✗ TS error: name must be string
t("greeting", { name: "Alice" }) // ✓
```

### `plural<T>()` — count-based pluralization

```ts
import { plural } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "ui",
  definition: {
    itemCount: plural<{ count: number }>(),
    daysRemaining: plural<{ count: number }>(),
  },
});
```

`t("itemCount", { count: 1 })` → uses `itemCount_one` from DB.
`t("itemCount", { count: 5 })` → uses `itemCount_other` from DB.

DB stores suffixed keys:

```json
{
  "itemCount_one": "One item",
  "itemCount_other": "{count} items",
  "itemCount_zero": "No items"
}
```

Suffixes are determined by `Intl.PluralRules(locale).select(count)`. Available suffixes: `zero`, `one`, `two`, `few`, `many`, `other`. Which ones are used depends on the locale's CLDR rules — English uses `one` and `other`; Arabic uses all six.

If a specific suffix key is missing, falls back to `_other`.

### `rich<Tags>()` — JSX rich text

```ts
import { rich } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "legal",
  definition: {
    termsAccept: rich<"b" | "termsLink" | "privacyLink">(),
  },
});
```

Used with `tRich` (from `useTranslations` hook or `createRichTranslator`):

```tsx
const { tRich } = useTranslations(ns);

tRich("termsAccept", {
  b: (chunks) => <strong>{chunks}</strong>,
  termsLink: (chunks) => <a href="/terms">{chunks}</a>,
  privacyLink: (chunks) => <a href="/privacy">{chunks}</a>,
})
```

DB value: `"I accept the <b>Terms</b> and <privacyLink>Privacy Policy</privacyLink>"`.

Returns `ReactNode`. TypeScript errors if:
- You call `tRich` on a `key` or `vars` key
- You omit a tag declared in `Tags`
- You pass a tag name not in `Tags`

## Nested keys

```ts
const ns = defineNamespace({
  name: "nav",
  definition: {
    topNav: {
      home: key,
      about: key,
      contact: key,
    },
    footer: {
      copyright: vars<{ year: number }>(),
      links: {
        privacy: key,
        terms: key,
      },
    },
  },
});
```

Nested keys are accessed with dot notation:

```ts
t("topNav.home")
t("footer.copyright", { year: 2025 })
t("footer.links.privacy")
```

In the database and fallback JSON, keys are stored flat:

```json
{
  "topNav.home": "Home",
  "footer.copyright": "© {year}",
  "footer.links.privacy": "Privacy Policy"
}
```

## Registering namespaces

```ts
import { ALL_NAMESPACES } from "@repo/cms-config";

const cms = createCMS({
  namespaces: ALL_NAMESPACES,
  // ...
});
```

Unregistered namespaces can still be fetched from the DB (the API serves any namespace name), but they won't appear in the admin namespace list and won't be synced by `fallbackPlugin`.

## Describing a namespace

The admin API exposes a `describe` endpoint that returns metadata for each key — useful for building admin editor UIs:

```ts
const meta = await admin.namespaces.describe({ namespace: "nav" });
// [
//   { key: "topNav.home", type: "key", inputHint: "text" },
//   { key: "footer.copyright", type: "vars", vars: ["year"], inputHint: "text+vars" },
//   { key: "termsAccept", type: "rich", tags: ["b", "termsLink"], inputHint: "rich-text" },
// ]
```

See [Admin Client](../admin/admin-client.md).


---

[← Plugin System](../core-concepts/plugins.md) | [Using Translations →](using-translations.md)
