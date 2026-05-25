# Using Translations

## Client components

Use `useTranslations` inside any component wrapped by `CMSProvider`.

```tsx
"use client";
import { useTranslations } from "@modlog/better-cms/react";
import { commonNamespace } from "@repo/cms-config";

export function SubmitButton() {
  const { t, tRich } = useTranslations(commonNamespace);

  return (
    <div>
      <button type="submit">{t("submit")}</button>
      <p>
        {tRich("termsAndConditions", {
          b: (chunks) => <strong>{chunks}</strong>,
          link: (chunks) => <a href="/terms">{chunks}</a>,
        })}
      </p>
    </div>
  );
}
```

### How `useTranslations` works

1. Checks `CMSProvider` context for the namespace — if pre-loaded server-side, returns immediately (no fetch)
2. If missing, calls `loadTranslations({ namespace: ns.name, locale })` in a `useEffect`
3. Returns `{ t, tRich }` — both functions are typed to your namespace definition

The hook never suspends. On the first render before data loads, `t("submit")` returns `""` (empty string from an empty translations object). Pre-seeding via `initialTranslations` avoids this.

### Pre-seeding to avoid flash

In a Next.js layout, fetch translations on the server and pass them to `CMSProvider`:

```tsx
// app/layout.tsx (Server Component)
import { loadTranslations } from "@modlog/better-cms/client";
import { CMSProvider } from "@modlog/better-cms/react";
import { commonNamespace } from "@repo/cms-config";
import "./cms-client"; // initialize singleton

export default async function RootLayout({ children, params }) {
  const common = await loadTranslations({
    namespace: commonNamespace.name,
    locale: params.locale,
  });

  return (
    <html lang={params.locale}>
      <body>
        <CMSProvider
          initialLocale={params.locale}
          initialTranslations={{ [commonNamespace.name]: common }}
        >
          {children}
        </CMSProvider>
      </body>
    </html>
  );
}
```

Now `useTranslations(commonNamespace)` in any child component reads from context without a client fetch.

## Server components (RSC)

React Server Components cannot use hooks. Use `getTranslations` (for Next.js) to automatically resolve the locale and fetch translations:

```tsx
// app/page.tsx (Server Component)
import { getTranslations } from "@modlog/better-cms/next";
import { commonNamespace } from "@repo/cms-config";

export default async function Page() {
  const { t, tRich } = await getTranslations(commonNamespace);

  return (
    <div>
      <h1>{t("greeting", { name: "Alice" })}</h1>
      <p>{tRich("termsAndConditions", { b: (c) => <b>{c}</b> })}</p>
    </div>
  );
}
```

If you are not using Next.js, use `loadTranslations` + `createTranslator` directly:

```tsx
import { loadTranslations } from "@modlog/better-cms/client";
import { createTranslator } from "@modlog/better-cms/i18n";

const data = await loadTranslations({ namespace: ns.name, locale });
const t = createTranslator({ ns, translations: data, locale });
```

`loadTranslations` respects the in-memory cache — if the layout already fetched `common/en`, this call returns immediately.

## Translator functions

### `t(key, vars?)` — plain and vars keys

```ts
const t = createTranslator({ ns, translations, locale: "en" });

t("submit")                           // "Submit"
t("greeting", { name: "Alice" })      // "Hello, Alice!"
t("itemCount", { count: 3 })          // "3 items"
t("nonExistentKey")                   // "nonExistentKey" (raw key fallback)
```

TypeScript enforces:
- Key exists in the namespace
- Correct vars shape for `vars<T>()` and `plural<T>()` keys
- `rich<>()` keys are excluded — use `tRich` for those

### `tRich(key, tags)` — rich text keys

```ts
const tRich = createRichTranslator({ ns, translations, locale: "en" });

tRich("terms", {
  b: (chunks) => <strong>{chunks}</strong>,
  link: (chunks) => <a href="/terms">{chunks}</a>,
})
// Returns: ReactNode
```

TypeScript enforces:
- Key is declared with `rich<Tags>()`
- All declared `Tags` are provided in the map
- `key`, `vars`, and `plural` keys are excluded

## Pluralization detail

For plural keys, the translator selects the right DB key using `Intl.PluralRules`:

```ts
// DB contains:
// { "itemCount_one": "One item", "itemCount_other": "{count} items" }

t("itemCount", { count: 1 }) // → "One item"      (rule: "one")
t("itemCount", { count: 0 }) // → "0 items"        (rule: "other" in English)
t("itemCount", { count: 5 }) // → "5 items"        (rule: "other")
```

For locales with more plural forms (e.g., Polish, Arabic), add the corresponding suffixed keys to the DB.

## Locale switching

```tsx
"use client";
import { useLocale } from "@modlog/better-cms/react";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <button onClick={() => setLocale(locale === "en" ? "de" : "en")}>
      Switch to {locale === "en" ? "German" : "English"}
    </button>
  );
}
```

`setLocale` updates the context locale and persists the choice in a cookie. The `CMSProvider` does not automatically re-fetch translations on locale change — pair it with `router.refresh()` or a page reload.

## Background refresh

Keep translations fresh for long-lived sessions:

```tsx
<CMSProvider initialLocale="en" refetchInterval={300}>
  {children}
</CMSProvider>
```

Every 300 seconds, all loaded namespaces are re-fetched in parallel and context is updated.


---

[← Defining Namespaces](defining-namespaces.md) | [Defining Page Blocks →](../pages/defining-blocks.md)
