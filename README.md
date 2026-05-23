# @modlog/better-cms <!-- omit in toc -->

Framework-agnostic type-safe, self-hosted full-stack TypeScript CMS for translations and page content. Compatible with Elysia, Prisma/Drizzle, and React.

`@modlog/better-cms` is designed for **monorepos**. It provides a headless backend infrastructure and typed React hooks to build your own admin UI and consume translations/page blocks in your frontend.

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Architecture \& Core Concepts](#architecture--core-concepts)
  - [Fallback Strategy](#fallback-strategy)
  - [Caching Strategy](#caching-strategy)
- [Opinions](#opinions)
  - [1. Route-Based Namespace Naming](#1-route-based-namespace-naming)
  - [2. Component-Driven Block Definitions](#2-component-driven-block-definitions)
  - [3. Shared Definition Package (`@repo/cms-config`)](#3-shared-definition-package-repocms-config)
  - [4. Production Safety via Fallback Plugin](#4-production-safety-via-fallback-plugin)
- [Quick Start (Elysia, Prisma, React, Next.js)](#quick-start-elysia-prisma-react-nextjs)
  - [1. Shared Configuration Package](#1-shared-configuration-package)
  - [2. Database Setup](#2-database-setup)
  - [3. Backend API Setup](#3-backend-api-setup)
  - [4. Client Configuration](#4-client-configuration)
  - [Translations](#translations)
    - [Client Components](#client-components)
    - [Server Components](#server-components)
  - [Page Content](#page-content)
- [Building the Admin UI](#building-the-admin-ui)
  - [React Hooks (Next.js / Generic React)](#react-hooks-nextjs--generic-react)
  - [TanStack Start (Server Functions)](#tanstack-start-server-functions)
- [Adapters](#adapters)
  - [Database](#database)
  - [Storage Adapters](#storage-adapters)
- [Plugins](#plugins)
  - [Pages Plugin](#pages-plugin)
  - [Media Plugin](#media-plugin)
  - [Fallback Plugin](#fallback-plugin)

## Installation

In a monorepo, you typically install @modlog/better-cms` in your shared configuration package and your application packages.

```bash
# In your shared config package (e.g. packages/cms-config)
bun add @modlog/better-cms

# In your API and Web apps
bun add @modlog/better-cms
```

**Required Peer Dependencies:**

- `react`, `@tanstack/react-query`, `zod`

**Optional/Stack-Specific Peer Dependencies:**

- `elysia`, `next`, `@tanstack/start`
- `@prisma/client`
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

## Architecture & Core Concepts

- **Shared Types:** All translation namespaces and page blocks are defined in a shared package (e.g., `@repo/cms-config`) to ensure end-to-end type safety.
- **Zero Pre-built UI:** `@modlog/better-cms` exports handlers, hooks, and typed clients. You build the frontend and admin panels.
- **Subpath Exports:** Imports are structured by domain to allow tree-shaking (e.g., `@modlog/better-cms/next`, `@modlog/better-cms/react`, `@modlog/better-cms/prisma`).

### Fallback Strategy

Translations are resolved using a multi-tier fallback chain to ensure your UI never breaks:

1. **In-memory Cache:** Fast lookups for already loaded namespaces.
2. **CMS API:** Fetches the latest live values from the database.
3. **Local JSON Files:** Uses the `fallback` function configured via `configureCMSClient`. This typically performs a **dynamic `import()`** of local JSON files (synced by the `fallbackPlugin`), allowing the browser to load a static "snapshot" of your translations only if the API is unreachable.
4. **Key String:** If all else fails, the `t()` function returns the raw key string.

### Caching Strategy

Performance is a first-class issue in `@modlog/better-cms`. It uses an **eventually consistent** caching model to minimize database load and network latency:

- **Client-Side In-Memory Cache:** All API responses are stored in a **global in-memory singleton** within the `@modlog/better-cms/client` package. With a 60-second TTL, this cache prevents redundant network requests during client-side navigation.
- **Request Deduplication:** If multiple components request the same translation namespace simultaneously, the client package tracks **in-flight promises** and deduplicates them into a single flight request, preventing "waterfall" overhead.
- **Zero-Roundtrip Initial Load:** By passing `initialTranslations` or `initialContent` to the `CMSProvider` (populated during SSR), the **React Context state** is pre-seeded. This allows your application to render immediately without any client-side fetches.
- **Edge/CDN Caching:** The API serves standard `Cache-Control: s-maxage=60, stale-while-revalidate=300` headers. This enables caching at the **network edge** (e.g., Cloudflare, Vercel Edge, or Nginx), offloading traffic from your origin server entirely.

> [!TIP]
> **Technical Note:** The client-side cache uses a lightweight internal singleton to maintain a zero-dependency runtime. This design is optimized for **request deduplication** (preventing "waterfall" requests) and acts as a **warmed process-cache** during SSR, sharing fetched data across all concurrent requests for 60 seconds.

## Opinions

To keep your codebase clean and scalable as it grows, we suggest following these design opinions:

### 1. Route-Based Namespace Naming
Name your translation namespaces after your frontend URL structure. This makes it instantly obvious where a specific text is used.
*   `common` — Global elements (buttons, nav, footer)
*   `dashboard` — Home dashboard
*   `dashboard.profile` — Profile settings
*   `dashboard.profile.[id].settings` — Individual user settings

### 2. Component-Driven Block Definitions
Treat page blocks as "data-only components." Keep block schemas granular and map them 1:1 to your React components. Instead of a massive `Content` block with 20 optional fields, create `Hero`, `FeatureGrid`, and `PricingTable` blocks.

### 3. Shared Definition Package (`@repo/cms-config`)
In a monorepo, **never** define your namespaces or blocks directly in the API or Web app. Always use a central package like `@repo/cms-config`. This is the only way to ensure that a change to a block schema or translation marker is immediately caught by the TypeScript compiler in every application.

### 4. Production Safety via Fallback Plugin
In production, your CMS API should not be a "hard dependency." Always enable the `Fallback Plugin` to sync your database values to local JSON files. By importing these files in your frontend's `configureCMSClient`, your site will remain functional even during database maintenance or API downtime.

## Quick Start (Elysia, Prisma, React, Next.js)

### 1. Shared Configuration Package

Create a package (e.g., `packages/cms-config`) to house your definitions.

**`packages/cms-config/index.ts`**

```ts
import { defineNamespace, key, vars, plural, rich } from "@modlog/better-cms/i18n";
import { z } from "zod";
import type { PageBlock } from "@modlog/better-cms/plugins/pages";

// 1. Define Translation Namespaces
export const commonNamespace = defineNamespace("common", {
  greeting: vars<{ name: string }>(), // Interpolated variables: "Hello, {name}!"
  items: plural<{ count: number }>(), // Pluralization: "items_one": "One item", "items_other": "{count} items"
  termsAndConditions: rich<"b" | "link">(), // Rich-text with JSX tags: "Accept <b>Terms</b>"
  submit: key, // Simple static string: "Submit"
});

export const dashboardNamespace = defineNamespace("dashboard", {
  // ...
});

export const settingsNamespace = defineNamespace("settings", {
  // ...
});

// 2. Define Page Blocks
export const heroBlock: PageBlock = {
  type: "hero",
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
  }),
};

export const ALL_PAGE_BLOCKS = [heroBlock];
export const ALL_NAMESPACES = [commonNamespace, dashboardNamespace, settingsNamespace];
```

### 2. Database Setup

Add the following models to your Prisma schema in your database package (e.g., `@repo/db`).

**`packages/db/schema.prisma`**

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
  status      String    @default("draft") // "draft" | "published"
  publishedAt DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([slug, locale])
}

model Locale {
  code      String   @id // e.g., "en", "de"
  name      String   // e.g., "English", "German"
  isDefault Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

### 3. Backend API Setup

Initialize the CMS and mount the routes in your API application (e.g., `apps/cms-api`).

**`apps/cms-api/src/cms.ts`**

```ts
import { createCMS } from "@modlog/better-cms";
import { prismaAdapter } from "@modlog/better-cms/prisma";
import { pagesPlugin } from "@modlog/better-cms/plugins/pages";
import { mediaPlugin } from "@modlog/better-cms/plugins/media";
import { awsS3Adapter } from "@modlog/better-cms/storage/aws";
import { PrismaClient } from "@prisma/client";
import { ALL_NAMESPACES, ALL_PAGE_BLOCKS } from "@repo/cms-config";

const prisma = new PrismaClient();

export const cms = createCMS({
  database: prismaAdapter(prisma),
  namespaces: ALL_NAMESPACES,
  auth: {
    internalToken: process.env.CMS_INTERNAL_TOKEN!,
  },
  plugins: [
    pagesPlugin({ blocks: ALL_PAGE_BLOCKS }),
    mediaPlugin({
      storage: awsS3Adapter({
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
        cdnUrl: process.env.CDN_URL!,
      }),
    }),
  ],
});
```

**`apps/cms-api/src/index.ts` (Elysia Example)**

```ts
import { Elysia } from "elysia";
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { cms } from "./cms";

const app = new Elysia()
  .use(toElysiaPlugin(cms))
  .listen(3000);
```

**`apps/web/app/api/cms/[...slug]/route.ts` (Next.js Example)**

```ts
import { toNextHandler } from "@modlog/better-cms/next";
import { toElysiaPlugin } from "@modlog/better-cms/elysia";
import { cms } from "@/lib/cms"; // Assume cms is initialized here

const handler = toElysiaPlugin(cms).handle;

export const GET = handler;
export const POST = handler;
export const PUT = handler;
```

### 4. Client Configuration

Configure the CMS client in your frontend application (e.g., `apps/web`).

> [!NOTE]
> `configureCMSClient` initializes an **internal singleton** that stores your API endpoint and read token. This state is required by all subsequent `loadTranslations` and `loadPageContent` calls (including hooks). Because it sets this global state, the file must be imported in your root layout or entry point to ensure it executes exactly once before any data fetching begins.

**`apps/web/src/cms-client.ts`**

```ts
import { configureCMSClient } from "@modlog/better-cms/client";

configureCMSClient({
  cmsUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  readToken: process.env.NEXT_PUBLIC_CMS_READ_TOKEN!,
  // Optional fallback to local JSON files if API is down
  fallback: async (ns, locale) => {
    try {
      return (await import(`./locales/${locale}/${ns}.json`)).default;
    } catch {
      return null;
    }
  },
});
```

**`apps/web/src/app/layout.tsx`**

```tsx
import "./cms-client"; // Initialize CMS configuration side-effect
import { CMSProvider } from "@modlog/better-cms/react";

export default function RootLayout({ children }) {
  return (
    <CMSProvider locale="en">
      {children}
    </CMSProvider>
  );
}
```

### Translations

#### Client Components
Use the `useTranslations` hook with your shared namespace definition.

**`apps/web/src/components/Greeting.tsx`**
```tsx
"use client";
import { useTranslations } from "@modlog/better-cms/react";
import { commonNamespace } from "@repo/cms-config";

export function Greeting() {
  const { t, tRich } = useTranslations(commonNamespace);

  return (
    <div>
      <h1>{t("greeting", { name: "Alice" })}</h1>
      <p>
        {tRich("termsAndConditions", {
          b: (chunks) => <b>{chunks}</b>,
          link: (chunks) => <a href="/terms">{chunks}</a>,
        })}
      </p>
    </div>
  );
}
```

#### Server Components
For Server Components (RSC), fetch the translations manually and create a translator.

**`apps/web/src/app/page.tsx`**
```tsx
import { loadTranslations } from "@modlog/better-cms/client";
import { createTranslator } from "@modlog/better-cms/i18n";
import { commonNamespace } from "@repo/cms-config";

export default async function Page() {
  const data = await loadTranslations(commonNamespace.name, "en");
  const t = createTranslator(commonNamespace, data, "en");

  return <h1>{t("submit")}</h1>;
}
```

### Page Content

Fetch page blocks dynamically.

**`apps/web/src/app/[slug]/page.tsx`**

```tsx
import { usePageContent } from "@modlog/better-cms/react";

export function DynamicPage({ params }) {
  const blocks = usePageContent(params.slug);

  return (
    <main>
      {blocks.map((block, i) => {
        if (block.type === "hero") return <Hero key={i} data={block.data} />;
        return null;
      })}
    </main>
  );
}
```

## Building the Admin UI

`@modlog/better-cms` provides typed clients and hooks for your admin application (e.g., `apps/admin`).

### React Hooks (Next.js / Generic React)

**`apps/admin/src/providers/AdminProvider.tsx`**

```tsx
import { createAdminClient } from "@modlog/better-cms/admin";
import { createAdminHooks, AdminQueryProvider } from "@modlog/better-cms/admin/react";

const adminClient = createAdminClient({
  cmsUrl: "/api",
  token: process.env.CMS_INTERNAL_TOKEN!,
});

export const {
  useNamespaceTranslations,
  useUpdateTranslation,
  usePages,
  useLocales
} = createAdminHooks(adminClient);

export function AdminProvider({ children }) {
  return (
    <AdminQueryProvider>
      {children}
    </AdminQueryProvider>
  );
}
```

### TanStack Start (Server Functions)

**`apps/admin/src/cms-fns.ts`**

```ts
import { createServerFn } from "@tanstack/start";
import { createAdminClient } from "@modlog/better-cms/admin";
import { createServerFns } from "@modlog/better-cms/tanstack-start";

const admin = createAdminClient({
  cmsUrl: process.env.CMS_URL!,
  token: process.env.CMS_INTERNAL_TOKEN!,
});

const rawFns = createServerFns(admin);

export const getPages = createServerFn({ method: "GET" })
  .handler(() => rawFns.listPages());

export const updatePage = createServerFn({ method: "POST" })
  .validator((d: { id: string, blocks: any[] }) => d)
  .handler(({ data }) => rawFns.updatePage(data.id, data.blocks));
```

## Adapters

### Database

- `prismaAdapter(prismaClient)` from `@modlog/better-cms/prisma`
- `drizzleAdapter` (_TO BE IMPLEMENTED_)

### Storage Adapters

Exported from `@modlog/better-cms/storage/*`:

- `awsS3Adapter({ bucket, region, credentials, cdnUrl })`
- `cloudflareR2Adapter({ bucket, accountId, credentials, publicUrl })`
- `hetznerS3Adapter({ bucket, region, credentials, publicUrl })`
- `localStorageAdapter({ dir, baseUrl })` (Development only)

## Plugins

Plugins extend the core CMS functionality and are registered in your `createCMS` configuration.

### Pages Plugin

Adds support for dynamic page blocks, draft/published status, and slug-based routing.

**`apps/api/src/cms.ts`**

```ts
import { pagesPlugin } from "@modlog/better-cms/plugins/pages";
import { allBlocks } from "@repo/cms-config";

// ...
plugins: [
  pagesPlugin({ blocks: allBlocks })
]
```

### Media Plugin

Provides an API for generating presigned S3 upload URLs, enabling direct browser-to-storage uploads.

**`apps/api/src/cms.ts`**

```ts
import { mediaPlugin } from "@modlog/better-cms/plugins/media";
import { awsS3Adapter } from "@modlog/better-cms/storage/aws";

// ...
plugins: [
  mediaPlugin({
    storage: awsS3Adapter({ /* options */ })
  })
]
```

### Fallback Plugin

Automatically syncs translation updates from the database to local JSON files on the filesystem. This is used by the frontend to provide offline or "maintenance mode" translations.

**`apps/api/src/cms.ts`**

```ts
import { fallbackPlugin } from "@modlog/better-cms/plugins/fallback";
import { join } from "node:path";

// ...
plugins: [
  fallbackPlugin({
    // Point this to a folder your frontend app can import from
    outputDir: join(__dirname, "../../../apps/web/locales")
  })
]
```
