# Quick Start

This guide walks through a full monorepo setup: shared config package, Prisma database, Elysia backend, and Next.js frontend.

## Overview

```
monorepo/
├── packages/
│   └── cms-config/          ← shared namespace + block definitions
├── apps/
│   ├── api/                 ← Elysia backend serving /cms/*
│   └── web/                 ← Next.js frontend consuming translations
```

---

## Step 1: Shared config package

Create `packages/cms-config/index.ts`. This is the **single source of truth** for what keys and blocks exist.

```ts
import { defineNamespace, key, vars, plural, rich } from "@modlog/better-cms/i18n";
import { z } from "zod";
import type { PageBlock } from "@modlog/better-cms/plugins/pages";

// Translation namespaces
export const commonNamespace = defineNamespace("common", {
  submit: key,
  cancel: key,
  greeting: vars<{ name: string }>(),
  itemCount: plural<{ count: number }>(),
  termsAndConditions: rich<"b" | "link">(),
});

export const dashboardNamespace = defineNamespace("dashboard", {
  title: key,
  welcomeBack: vars<{ name: string }>(),
});

export const ALL_NAMESPACES = [commonNamespace, dashboardNamespace];

// Page blocks
export const heroBlock: PageBlock = {
  type: "hero",
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    ctaLabel: z.string(),
    ctaHref: z.string(),
  }),
};

export const ALL_PAGE_BLOCKS = [heroBlock];
```

> **Why a shared package?**  
> TypeScript can only enforce type safety if both the API (which stores data) and the frontend (which reads data) import from the same definition. If you define namespaces separately in each app, you lose that guarantee.

---

## Step 2: Database schema

Add these models to your `schema.prisma`:

```prisma
model TranslationNamespace {
  name   String
  locale String
  values Json   @default("{}")

  @@id([name, locale])
}

model Page {
  id          String    @id
  slug        String
  locale      String
  blocks      Json      @default("[]")
  status      String    @default("draft")
  publishedAt DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([slug, locale])
}

model Locale {
  code      String   @id
  name      String
  isDefault Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

Run migrations:

```bash
bunx prisma migrate dev --name init
```

---

## Step 3: Backend (Elysia)

**`apps/api/src/cms.ts`**

```ts
import { createCMS } from "@modlog/better-cms";
import { prismaAdapter } from "@modlog/better-cms/prisma";
import { pagesPlugin } from "@modlog/better-cms/plugins/pages";
import { fallbackPlugin } from "@modlog/better-cms/plugins/fallback";
import { PrismaClient } from "@prisma/client";
import { ALL_NAMESPACES, ALL_PAGE_BLOCKS } from "@repo/cms-config";
import { join } from "node:path";

const prisma = new PrismaClient();

// CMS Singleton
export const cms = createCMS({
  database: prismaAdapter(prisma),
  namespaces: ALL_NAMESPACES,
  initialLocales: [
    { code: "en", name: "English", isDefault: true },
    { code: "de", name: "German" },
  ],
  auth: {
    readToken: process.env.CMS_READ_TOKEN!,
    adminToken: process.env.CMS_ADMIN_TOKEN!,
  },
  plugins: [
    pagesPlugin({ blocks: ALL_PAGE_BLOCKS }),
    fallbackPlugin({
      // Path your web app fallback locales (same disk, e.g. monorepo)
      // If your API does not have disk accesst to the fallback locale directory, look at fallbackSyncPlugin()
      outputDir: join(__dirname, "../../../apps/web/<your-locale-folder>"),
    }),
  ],
});
```

**`apps/api/src/index.ts`**

```ts
import { Elysia } from "elysia";
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { cms } from "./cms";

new Elysia()
  .use(toElysiaPlugin(cms))
  .listen(3001);
```

This mounts all CMS routes under `/cms/*`.

---

## Step 4: Frontend (Next.js)

### Initialize the client singleton

**`apps/web/src/cms-client.ts`**

```ts
import { configureCMSClient } from "@modlog/better-cms/client";

// this does not need to be exported as it will be registered as a side-effect import
configureCMSClient({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL!,
  readToken: process.env.NEXT_PUBLIC_CMS_READ_TOKEN!,
  fallback: async (ns, locale) => {
    try {
      return (await import(`../<your-locale-folder>/${locale}/${ns}.json`)).default;
    } catch {
      return null;
    }
  },
});
```

### Root layout

**`apps/web/src/app/layout.tsx`**

```tsx
import "./cms-client"; // side-effect import — must run before any data fetch
import { CMSProvider } from "@modlog/better-cms/react";
import { getLocale } from "@modlog/better-cms/next";

export default async function RootLayout({ 
  children,
  params 
}: { 
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Read locale from URL params or fallback to cookie/default
  const locale = params.locale ?? await getLocale();

  return (
    <html lang={locale}>
      <body>
        <CMSProvider initialLocale={locale}>
          {children}
        </CMSProvider>
      </body>
    </html>
  );
}
```

### Use translations in a client component

```tsx
"use client";
import { useTranslations } from "@modlog/better-cms/react";
import { commonNamespace } from "@repo/cms-config";

export function SubmitButton() {
  const { t } = useTranslations(commonNamespace);
  return <button type="submit">{t("submit")}</button>;
}
```

### Use translations in a server component

```tsx
import { getTranslations } from "@modlog/better-cms/next";
import { commonNamespace } from "@repo/cms-config";

export default async function Page() {
  const { t } = await getTranslations(commonNamespace);
  return <h1>{t("greeting", { name: "Alice" })}</h1>;
}
```

---

## Environment variables

| Variable                     | Where | Description                       |
| ---------------------------- | ----- | --------------------------------- |
| `CMS_READ_TOKEN`             | API   | Token for read-only access        |
| `CMS_ADMIN_TOKEN`            | API   | Secret token for all admin writes |
| `NEXT_PUBLIC_CMS_URL`        | Web   | Public URL of the CMS API         |
| `NEXT_PUBLIC_CMS_READ_TOKEN` | Web   | Token for read-only endpoints     |

> The `readToken` is for GET requests to translations and single pages. The `adminToken` is for everything else (writes, media, locales, listing all pages). Both use the `x-internal-token` header. Keep the `adminToken` secret and never expose it to the browser. Use `NEXT_PUBLIC_CMS_READ_TOKEN` for client-side read access.

---

## Next steps

- [Defining Namespaces](../translations/defining-namespaces.md) — all marker types in depth
- [Using Translations](../translations/using-translations.md) — SSR, client hooks, locale switching
- [Plugins](../plugins/pages-plugin.md) — pages, media, fallback
- [Building an Admin UI](../admin/building-admin-ui.md)


---

[← Installation](installation.md) | [Database Schema →](database-schema.md)
