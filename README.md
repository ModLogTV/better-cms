# @modlog/better-cms <!-- omit in toc -->

Framework-agnostic type-safe, self-hosted full-stack TypeScript CMS for translations, asset management and page content.

`@modlog/better-cms` is designed for **monorepos**. It provides a headless backend infrastructure and typed React hooks to build your own admin UI and consume translations/page blocks in your frontend.

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Framework Compatibility](#framework-compatibility)
  - [Frontend \& Fullstack](#frontend--fullstack)
  - [Backend \& Database](#backend--database)
- [Roadmap](#roadmap)
- [Architecture \& Core Concepts](#architecture--core-concepts)
  - [Fallback Strategy](#fallback-strategy)
- [Quick Start (Elysia, Prisma, React, Next.js)](#quick-start-elysia-prisma-react-nextjs)
  - [1. Shared Configuration Package](#1-shared-configuration-package)
  - [3. Backend API Setup](#3-backend-api-setup)
  - [4. Client Configuration](#4-client-configuration)
  - [Translations](#translations)
    - [Client Components](#client-components)
    - [Server Components (RSC)](#server-components-rsc)
- [Building the Admin UI](#building-the-admin-ui)
  - [React Hooks](#react-hooks)
- [Plugins](#plugins)
  - [Media Plugin](#media-plugin)

## Installation

In a monorepo, you typically install `@modlog/better-cms` in your shared configuration package and your application packages.

```bash
# In your shared config package (e.g. packages/cms-config)
bun add @modlog/better-cms

# In your API and Web apps
bun add @modlog/better-cms
```

**Required Peer Dependencies:**

- `react`, `@tanstack/react-query`, `zod`

**Optional/Stack-Specific Peer Dependencies:**

- `elysia`, `next`, `@tanstack/start`, `@prisma/client`

## Framework Compatibility

### Frontend & Fullstack
- **React** `Frontend` — Hooks and Context for client-side translation and page rendering.
- **Next.js** `Fullstack` — Optimized handlers for RSC, App Router, and edge-ready API proxies.
- **TanStack Start** `Fullstack` — Typed server function wrappers for modern React fullstack apps.

### Backend & Database
- **Elysia** `Backend` — High-performance API routes and middleware for Bun environments.
- **Prisma** `ORM` — Robust database adapter for type-safe content persistence.
- **Drizzle** `ORM` — Lightweight database adapter (initial implementation in roadmap).

## Roadmap

The following features are prioritized by architectural dependency and implementation order.

|      | Feature                           | Category    | Description                                                                                       |
| :--- | :-------------------------------- | :---------- | :------------------------------------------------------------------------------------------------ |
| ✅    | **Client Lifecycle**              | Framework   | Integrated hooks for custom error handling, loading states, and client events.                    |
| ✅    | **User Management X better-auth** | Framework   | Replace read/write token authentication with real user auth                                       |
| ✅    | **Core Media System**             | Media       | Fundamental system for images/media in content pages and file distribution (download links etc.). |
| 🔘    | **Fall-through translations**     | Framework   | Take in random strings and returning translations if available, the string otherwise              |
| 🔘    | **Built-in Admin Panel**          | Media       | Ready to go pre-configured admin panel                                                            |
| 🔘    | **Drizzle Adapter**               | Framework   | Official database adapter for Drizzle ORM to expand database support.                             |
| 🔘    | **Data Interceptors**             | Framework   | Middleware to programmatically validate or transform content before saving.                       |
| 🔘    | **Distributed Fallback**          | Reliability | Prioritize local JSON files if API latency exceeds a specific threshold.                          |
| 🔘    | **Smart Preview Logic**           | DX          | Standardized context to toggle between "Published" and "Latest Draft" in hooks.                   |
| 🔘    | **Custom Statuses**               | Primitives  | User-defined states (e.g. "Archived") with built-in data fetcher filtering.                       |
| 🔘    | **Multi-Instance Support**        | Enterprise  | Native pattern for isolating data by `siteId` or `tenantId` in shared tables.                     |
| 🔘    | **Audit Event Stream**            | Primitives  | Global lifecycle hooks to pipe CMS actions to user-defined audit tables.                          |
| 🔘    | **Versioning Engine**             | Primitives  | Core logic for tracking and restoring historical states of content.                               |
| 🔘    | **Event Webhooks**                | Framework   | Outbound HTTP triggers for core CMS events (save, delete, publish).                               |
| 🔘    | **Media Hooks**                   | Media       | Interface for connecting image processing libraries (e.g., Sharp).                                |
| 🔘    | **Metadata Extraction**           | Media       | Extensible logic for extracting EXIF/IPTC data during upload.                                     |
| 🔘    | **Temporal Publishing**           | Primitives  | API logic for `validFrom` / `validUntil` time-based content resolution.                           |
| 🔘    | **SEO Schema Primitives**         | Framework   | Typed Zod-based block primitives for standard metadata.                                           |
| 🔘    | **Granular Auth**                 | Enterprise  | Support for custom permission logic beyond the dual-token system.                                 |
| 🔘    | **Search Sync Adapters**          | Enterprise  | Background sync logic for external indexes (Algolia, Meilisearch).                                |

> 🔘 Todo &nbsp;&nbsp; 🏗️ In Progress &nbsp;&nbsp; ✅ Done

## Architecture & Core Concepts

- **Shared Types:** All definitions are shared via a package (e.g., `@repo/cms-config`) for end-to-end type safety.
- **Dual-Token Auth:** Split access into `readToken` (frontend) and `adminToken` (administrative writes).
- **Subpath Exports:** Domain-specific imports like `@modlog/better-cms/next` or `@modlog/better-cms/react`.
- **Modularity**: Highly modular architecture (like better-auth) that uses centralized plugin imports and a framework singleton instance

### Fallback Strategy

Translations resolve through a multi-tier chain:

1. **In-memory Cache:** Fast lookups (60s TTL).
2. **CMS API:** Live values from the database.
3. **Local JSON Files:** Static snapshot via `fallback` loader (offline-safe).
4. **Key String:** Returns raw key if all else fails.

## Quick Start (Elysia, Prisma, React, Next.js)

### 1. Shared Configuration Package

**`packages/cms-config/index.ts`**

```ts
import { defineNamespace, key, vars, plural, rich } from "@modlog/better-cms/i18n";
import { z } from "zod";

export const commonNamespace = defineNamespace({
  name: "common",
  definition: {
    greeting: vars<{ name: string }>("name"),
    items: plural<{ count: number }>(),
    submit: key,
  },
});

export const heroBlock = {
  type: "hero",
  schema: z.object({ title: z.string() }),
};

export const ALL_PAGE_BLOCKS = [heroBlock];
export const ALL_NAMESPACES = [commonNamespace];
```

### 3. Backend API Setup

**`apps/api/src/cms.ts`**

```ts
import { createCMS } from "@modlog/better-cms";
import { prismaAdapter } from "@modlog/better-cms/prisma";

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
    mediaPlugin({ storage: awsS3Adapter({ /* ... */ }) }),
  ],
});
```

### 4. Client Configuration

**`apps/web/src/cms-client.ts`**

```ts
import { configureCMSClient } from "@modlog/better-cms/client";

configureCMSClient({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL!,
  readToken: process.env.NEXT_PUBLIC_CMS_READ_TOKEN!,
});
```

**`app/layout.tsx`**

```tsx
import "./cms-client"; 
import { CMSProvider } from "@modlog/better-cms/react";
import { getLocale } from "@modlog/better-cms/next";

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  return (
    <CMSProvider initialLocale={locale}>
      {children}
    </CMSProvider>
  );
}
```

### Translations

#### Client Components

```tsx
"use client";
import { useTranslations } from "@modlog/better-cms/react";
import { commonNamespace } from "@repo/cms-config";

export function Greeting() {
  const { t } = useTranslations(commonNamespace);
  return <h1>{t("greeting", { name: "Alice" })}</h1>;
}
```

#### Server Components (RSC)

```tsx
import { getTranslations } from "@modlog/better-cms/next";
import { commonNamespace } from "@repo/cms-config";

export default async function Page() {
  const { t } = await getTranslations(commonNamespace);
  return <h1>{t("submit")}</h1>;
}
```

## Building the Admin UI

### React Hooks

```tsx
import { createAdminClient } from "@modlog/better-cms/admin";
import { createAdminHooks } from "@modlog/better-cms/admin/react";

const admin = createAdminClient({
  cmsUrl: "/api",
  token: process.env.CMS_ADMIN_TOKEN!,
});

export const { useNamespaceTranslations, useUpdatePage, useMediaUpload } = createAdminHooks(admin);
```

## Plugins

### Media Plugin

High-level helpers for effortless uploads and deletions.

```ts
// In your Admin UI
const { upload } = useMediaUpload();
const { publicUrl } = await upload({ file });

const { mutate: remove } = useMediaDelete();
remove({ key: "..." });
```
