# Next.js Adapter

better-cms provides two strategies for handling locales in Next.js. Choose the one that fits your application's requirements.

## 1. Choose your Strategy

| Strategy | Best For | URL Pattern | Implementation |
|----------|----------|-------------|----------------|
| **Cookie-based** | Dashboards, Apps behind auth, Clean URLs | `example.com/about` | **Proxy-free**. Uses cookies and browser headers. |
| **URL-based** | Marketing sites, Blogs, SEO-heavy sites | `example.com/en/about` | **Proxy-based**. Uses `proxy.ts` for redirects. |

---

## Strategy A: Cookie-based (Proxy-free)

This is the simplest setup. No URL prefixes, no extra files.

### Reading the locale in Server Components

`getLocale` automatically detects the user's language by checking the `locale` cookie first, then the browser's `Accept-Language` header.

```ts
import { getLocale } from "@modlog/better-cms/next";

// app/layout.tsx
export default async function RootLayout({ children }) {
  const locale = await getLocale(); 
  return <Providers initialLocale={locale}>{children}</Providers>;
}
```

### Switching locales

Use `useLocale()` in any Client Component. `setLocale` writes to a cookie and updates the context. Call `router.refresh()` to update Server Components.

```tsx
"use client";
import { useLocale } from "@modlog/better-cms/react";
import { useRouter } from "next/navigation";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  const switchTo = (next: string) => {
    setLocale(next);
    router.refresh();
  };

  return <button onClick={() => switchTo("de")}>Deutsch</button>;
}
```

---

## Strategy B: URL-based (Proxy-based)

Recommended for public websites where SEO and shareable, language-specific links are required.

### Setup the Proxy

Create a `proxy.ts` at your project root. It will redirect `/about` → `/en/about` based on user preference and ensure all links preserve the locale.

**`proxy.ts`**

```ts
import { NextResponse } from "next/server";
import { createNextProxy } from "@modlog/better-cms/next";
import { loadLocales } from "@modlog/better-cms/client";
import "./src/cms-client"; // Configure your tokens/URL here

const cmsProxy = createNextProxy({
  // Dynamic: fetches active locales from your CMS database
  locales: async () => {
    const locales = await loadLocales();
    return locales.map(l => l.code);
  },
  defaultLocale: "en",
});

export async function proxy(request) {
  const result = await cmsProxy(request);

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

### Reading the locale in RSCs

When using URL segments (e.g., `app/[locale]/page.tsx`), Next.js provides the locale in `params`. You can also still use `getLocale()`.

```ts
import { getLocale } from "@modlog/better-cms/next";

export default async function Page({ params }) {
  const locale = params.locale ?? await getLocale();
  // ...
}
```

---

## Shared Utilities

Regardless of your strategy, you need these common utilities.

### Route Handler (Backend)

If you run the CMS backend inside your Next.js app, mount the Elysia routes:

**`app/api/cms/[...slug]/route.ts`**

```ts
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { toNextHandler } from "@modlog/better-cms/next";
import { cms } from "@/lib/cms"; 

const { GET, PUT, POST, DELETE } = toNextHandler(toElysiaPlugin(cms).handle);
export { GET, PUT, POST, DELETE };
```

### Client-side configuration

The CMS client singleton must be initialized before any data fetching.

**`src/cms-client.ts`**

```ts
import { configureCMSClient } from "@modlog/better-cms/client";

configureCMSClient({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL!,
  readToken: process.env.NEXT_PUBLIC_CMS_READ_TOKEN!,
});
```

**`app/layout.tsx`**

```tsx
import "./cms-client"; // Must be the first import
import { CMSProvider } from "@modlog/better-cms/react";
```

### Next.js 14 vs 15 instrumentation

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
