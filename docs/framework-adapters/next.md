# Next.js Adapter

## Reading the locale in Server Components

`getLocale` reads the active locale directly from the `locale` cookie set by `useLocale` / `setLocale`. Use it in any Server Component, Server Action, or Route Handler — no middleware required.

```ts
import { getLocale } from "better-cms/next";

// app/layout.tsx
export default async function RootLayout({ children }) {
  const locale = await getLocale(); // reads "locale" cookie, falls back to "en"
  return <Providers initialLocale={locale}>{children}</Providers>;
}

// app/page.tsx
export default async function Page() {
  const locale = await getLocale();
  const data = await loadTranslations({ namespace: "common", locale });
  const t = createTranslator({ ns: commonNamespace, translations: data, locale });
  return <h1>{t("greeting", { name: "Guest" })}</h1>;
}
```

Options:

| Option | Default | Description |
|--------|---------|-------------|
| `cookieName` | `"locale"` | Cookie name written by `setLocale` |
| `defaultLocale` | `"en"` | Fallback when cookie is absent |

The `setLocale` function from `useLocale()` writes a `locale` cookie with `max-age=31536000` and `SameSite=Lax`. `getLocale` reads that same cookie server-side. Call `router.refresh()` after `setLocale` to re-run RSCs with the new locale.

```tsx
"use client";
import { useLocale } from "better-cms/react";
import { useRouter } from "next/navigation";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  const switchTo = (next: string) => {
    setLocale(next);
    router.refresh();
  };

  return <button onClick={() => switchTo(locale === "en" ? "de" : "en")}>Switch</button>;
}
```

## Route handler

Mount the CMS inside Next.js App Router as a catch-all API route:

**`apps/web/app/api/cms/[...slug]/route.ts`**

```ts
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { cms } from "@/lib/cms"; // your createCMS instance

const handler = toElysiaPlugin(cms).handle;

export const GET = handler;
export const PUT = handler;
export const POST = handler;
export const DELETE = handler;
```

This is useful when you run the CMS inside the same Next.js process rather than a separate API app.

`toNextHandler` is also exported as a convenience wrapper:

```ts
import { toNextHandler } from "@modlog/better-cms/next";

const { GET, PUT, POST } = toNextHandler(toElysiaPlugin(cms).handle);
export { GET, PUT, POST };
```

## Locale middleware

`createNextMiddleware` handles locale detection and URL prefixing:

**`middleware.ts`** (at the root of your Next.js app)

```ts
import { NextResponse } from "next/server";
import { createNextMiddleware } from "@modlog/better-cms/next";

const cmsMiddleware = createNextMiddleware({
  locales: ["en", "de", "fr"],
  defaultLocale: "en",
  cookieName: "locale", // optional, default: "locale"
});

export function middleware(request) {
  const result = cmsMiddleware(request);

  if (result?.redirect) {
    return NextResponse.redirect(result.redirect, {
      headers: { "x-locale": result.locale },
    });
  }

  const response = NextResponse.next();
  response.headers.set("x-locale", result?.locale ?? "en");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

### What the middleware does

1. Checks if the URL already has a locale prefix (`/en/about`) — skips if yes
2. Detects locale from (in order): cookie → `Accept-Language` header → `defaultLocale`
3. Redirects `/about` → `/en/about`
4. Sets `x-locale` response header

### Reading locale in RSCs

In a Server Component, read the locale from the `x-locale` header set by the middleware:

```ts
import { headers } from "next/headers";

export default async function Layout({ children }) {
  const locale = (await headers()).get("x-locale") ?? "en";
  // ...
}
```

Or use Next.js locale-based routing with `params.locale` from a `[locale]` segment:

```
app/
  [locale]/
    layout.tsx   ← params.locale
    page.tsx
```

## Client-side configuration

The CMS client singleton must be initialized before any data fetching. Import the side-effect file in your root layout:

**`src/cms-client.ts`**

```ts
import { configureCMSClient } from "@modlog/better-cms/client";

configureCMSClient({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL!,
  readToken: process.env.NEXT_PUBLIC_CMS_READ_TOKEN!,
  fallback: async (ns, locale) => {
    try {
      return (await import(`./locales/${locale}/${ns}.json`)).default;
    } catch {
      return null;
    }
  },
});
```

**`app/layout.tsx`**

```tsx
import "./cms-client"; // must be first import to execute before any loadTranslations call
import { CMSProvider } from "@modlog/better-cms/react";
```

## Next.js 14 vs 15 instrumentation

For the fallback sync plugin in Next.js < 15, enable instrumentation manually:

```ts
// next.config.ts
export default {
  experimental: {
    instrumentationHook: true,
  },
};
```

Next.js 15+ enables instrumentation by default. See [Fallback Sync Plugin](../plugins/fallback-sync-plugin.md).


---

[← Elysia Adapter](elysia.md) | [TanStack Start Adapter →](tanstack-start.md)
