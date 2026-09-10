# Namespaces & Markers

- [What is a namespace?](#what-is-a-namespace)
- [Markers](#markers)
  - [`key` - plain string](#key-plain-string)
  - [`vars<T>()` - interpolated string](#varst-interpolated-string)
  - [`plural<T>()` - pluralization](#pluralt-pluralization)
  - [`rich<Tags>()` - rich text with JSX](#richtags-rich-text-with-jsx)
- [Nested namespaces](#nested-namespaces)
- [Naming conventions](#naming-conventions)
- [Registration](#registration)

## What is a namespace?

A namespace is a named group of translation keys. It maps to one database row per locale (e.g., `{ name: "common", locale: "en" }`). All key definitions live in code; all values live in the database.

```ts
import { defineNamespace, key } from "@modlog/better-cms/i18n";

export const commonNamespace = defineNamespace({
  name: "common",
  definition: {
    submit: key,
    cancel: key,
  },
});
```

The name `"common"` must be unique across your app. It is used as the URL segment in API calls (`/cms/translations/common/en`) and as the filename in fallback JSON (`locales/en/common.json`).

## Markers

Markers are how you declare the _type_ of each translation key. TypeScript uses marker types to enforce correct call signatures on `t()` and `tRich()`.

### `key` - plain string

```ts
import { key } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "example",
  definition: {
    submit: key,
  },
});

// Usage:
t("submit") // → string
```

No arguments. Value in DB: `"Submit"`.

### `vars<T>()` - interpolated string

```ts
import { vars } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "example",
  definition: {
    greeting: vars<{ name: string }>(),
  },
});

// Usage:
t("greeting", { name: "Alice" }) // → "Hello, Alice!"
```

Value in DB uses `{varName}` tokens: `"Hello, {name}!"`.

TypeScript enforces that `{ name: string }` is passed - missing or extra keys are compile errors.

### `plural<T>()` - pluralization

```ts
import { plural } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "example",
  definition: {
    itemCount: plural<{ count: number }>(),
  },
});

// Usage:
t("itemCount", { count: 1 }) // → "One item"
t("itemCount", { count: 5 }) // → "5 items"
```

`T` must include `count: number`. Pluralization is resolved at runtime using `Intl.PluralRules(locale)`. The DB stores suffixed keys:

| DB key | Value |
|--------|-------|
| `itemCount_one` | `"One item"` |
| `itemCount_other` | `"{count} items"` |

Supported suffixes depend on the locale's CLDR plural rules: `zero`, `one`, `two`, `few`, `many`, `other`. If a specific suffix is missing, it falls back to `_other`.

### `rich<Tags>()` - rich text with JSX

```ts
import { rich } from "@modlog/better-cms/i18n";

const ns = defineNamespace({
  name: "example",
  definition: {
    terms: rich<"b" | "link">(),
  },
});

// Usage (in a component):
tRich("terms", {
  b: (chunks) => <strong>{chunks}</strong>,
  link: (chunks) => <a href="/terms">{chunks}</a>,
})
// Value in DB: "Accept <b>Terms</b> and <link>Privacy Policy</link>"
// Returns: ReactNode
```

`Tags` is a string union of allowed tag names. `tRich` is only available on keys declared with `rich<>()` - using it on a `key` or `vars` key is a TypeScript error.

Value in DB uses `<tagName>content</tagName>` syntax. Tags that are not in the `Tags` union are also TypeScript errors.

## Nested namespaces

Keys can be nested with objects. Flat access uses dot notation:

```ts
const ns = defineNamespace({
  name: "nav",
  definition: {
    topNav: {
      aboutUs: key,
      contact: key,
    },
  },
});

t("topNav.aboutUs") // ✓
t("topNav.invalid") // TypeScript error
```

> **Note:** The dot-notation flat key is what gets stored in the database and fallback JSON, not a nested object.

## Naming conventions

Recommended: match namespace names to your frontend URL structure.

```
common           → Global UI elements (buttons, errors)
dashboard        → /dashboard
dashboard.profile  → /dashboard/profile
settings         → /settings
```

This makes it immediately obvious where each text is used without needing comments.

## Registration

Every namespace must be passed to `createCMS`:

```ts
import { ALL_NAMESPACES } from "@repo/cms-config";

const cms = createCMS({
  namespaces: ALL_NAMESPACES,
  // ...
});
```

`createCMS` will throw if `namespaces` is empty.


---

[← Architecture](architecture.md) | [Locales →](locales.md)
