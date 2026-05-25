# @modlog/better-cms <!-- omit in toc -->

Framework-agnostic type-safe, self-hosted full-stack TypeScript CMS for translations and page content. Compatible with Elysia, Prisma/Drizzle, and React.

`@modlog/better-cms` is designed for **monorepos**. It provides a headless backend infrastructure and typed React hooks to build your own admin UI and consume translations/page blocks in your frontend.

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Roadmap](#roadmap)
  - [Content Orchestration Primitives](#content-orchestration-primitives)
  - [Framework \& DX](#framework--dx)
  - [Media \& Assets](#media--assets)
  - [Enterprise Primitives (Self-Hosted)](#enterprise-primitives-self-hosted)
  - [Reliability \& Performance](#reliability--performance)
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
  
## Roadmap

### Content Orchestration Primitives

- [ ] **Versioning Engine:** Core logic for tracking historical states of translations and page blocks.
- [ ] **Custom Content Statuses:** Support for user-defined content states (e.g. "Review Required", "Archived") with built-in filtering logic in the data fetchers.
- [ ] **Temporal Publishing:** Primitive fields and API logic for `validFrom` / `validUntil` content resolution.
- [ ] **Audit Event Stream:** Global lifecycle hooks to pipe CMS actions to user-defined logging/audit tables.

### Framework & DX

- [ ] **Drizzle Adapter:** Official database adapter for Drizzle ORM.
- [ ] **Smart Preview Logic:** Standardized context to toggle between "Published" and "Latest Draft" data within `useTranslations` and `usePageContent`.
- [ ] **Event Webhooks:** Outbound HTTP trigger support for core CMS events (save, delete, publish).
- [ ] **Data Interceptors:** Middleware to programmatically validate, clean, or transform content before it is saved to the database.
- [ ] **SEO Schema Definitions:** Typed Zod-based block primitives for standard metadata.

### Media & Assets

- [ ] **Media Transformation Hooks:** Interface for connecting image processing libraries (e.g., Sharp) to the media plugin.
- [ ] **Metadata Extraction:** Extensible logic for extracting EXIF/IPTC data during upload.

### Enterprise Primitives (Self-Hosted)

- [ ] **Granular Auth Middleware:** Support for custom permission logic beyond the dual-token system.
- [ ] **Multi-Instance Support:** Built-in pattern for isolating data by `siteId` or `tenantId` within a single database table.
- [ ] **Search Sync Adapters:** Background sync logic for external indexes (Algolia, Meilisearch).

### Reliability & Performance

- [ ] **Distributed Fallback Logic:** Improved multi-tier resolution that can prioritize local JSON files if the API latency exceeds a threshold, not just when it's offline.

## Architecture & Core Concepts

- **Shared Types:** All definitions are shared via a package (e.g., `@repo/cms-config`) for end-to-end type safety.
- **Dual-Token Auth:** Split access into `readToken` (frontend) and `adminToken` (administrative writes).
- **Subpath Exports:** Domain-specific imports like `@modlog/better-cms/next` or `@modlog/better-cms/react`.

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
