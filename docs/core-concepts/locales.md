# Locales

## Dynamic locale management

Locales are stored in the database (`Locale` model) and managed via the CMS API. There are no hardcoded locale lists — you add, update, and remove locales at runtime.

## Locale model

```prisma
model Locale {
  code      String   @id  // "en", "de", "fr"
  name      String        // "English", "German", "French"
  isDefault Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

## Automatic seeding

You can define a set of locales to be automatically created (upserted) in the database when the CMS starts up. This is useful for ensuring your development and production environments have the correct locales without manual intervention.

```ts
const cms = createCMS({
  // ...
  initialLocales: [
    // codes must be unique
    { code: "en", name: "English", isDefault: true },
    { code: "de", name: "German" },
    { code: "fr", name: "French" },
  ],
});
```

`createCMS` validates that at most one locale is marked as `isDefault: true`.

## Managing locales via the admin client

```ts
import { createAdminClient } from "@modlog/better-cms/admin";

const admin = createAdminClient({
  cmsUrl: process.env.CMS_URL!,
  token: process.env.CMS_INTERNAL_TOKEN!,
});

// List all active locales
const locales = await admin.locales.list();

// Add or update a locale
await admin.locales.upsert({ code: "de", name: "German" });
await admin.locales.upsert({ code: "en", name: "English", isDefault: true }); // isDefault = true

// Remove a locale
await admin.locales.delete({ code: "fr" });
```

## Default locale

At most one locale should have `isDefault: true`. The database adapter does not enforce uniqueness of `isDefault` — if you need enforcement, handle it in your admin UI logic.

The default locale is used by `createNextProxy` when no preference is detected from the cookie or `Accept-Language` header.

## Locale detection in Next.js

`createNextProxy` reads the locale from (in order of priority):

1. The locale cookie (default name: `"locale"`)
2. The `Accept-Language` request header
3. The configured `defaultLocale`

```ts
// proxy.ts
import { createNextProxy } from "@modlog/better-cms/next";

export default createNextProxy({
  locales: ["en", "de", "fr"],
  defaultLocale: "en",
  cookieName: "locale", // optional, default is "locale"
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

The proxy redirects `/about` → `/en/about` if no locale prefix is present, and sets the `x-locale` response header for reading in RSCs.

## Locale switching in React

```tsx
"use client";
import { useLocale } from "@modlog/better-cms/react";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="de">German</option>
    </select>
  );
}
```

`setLocale` writes to `document.cookie` with a 1-year expiry and updates the in-memory context. You typically also want to trigger a router refresh:

```tsx
import { useRouter } from "next/navigation";

const router = useRouter();
const { setLocale } = useLocale();

const handleChange = (locale: string) => {
  setLocale(locale);
  router.refresh();
};
```

## Locale in CMSProvider

Pass the current locale to `CMSProvider`. All hooks (`useTranslations`, `usePageContent`) inherit it from context.

```tsx
<CMSProvider initialLocale={params.locale}>
  {children}
</CMSProvider>
```

In Next.js with locale-prefixed routes (`/[locale]/...`), read `params.locale` from the layout's params and pass it down.


---

[← Namespaces & Markers](namespaces.md) | [Fallback Strategy →](fallback-strategy.md)
