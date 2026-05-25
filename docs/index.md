# @modlog/better-cms

A headless, type-safe, self-hosted CMS for translations and page content. Designed for **TypeScript monorepos**.

## What it is

`@modlog/better-cms` gives you:

- A **backend API** (Elysia-based) that stores translations and page blocks in your own database
- **React hooks and SSR utilities** to consume content in your frontend
- A **typed admin client + hooks** to build your own admin interface

It is **not** a hosted service, not a WordPress alternative, and not a drop-in UI. You own the infrastructure and build the admin UI yourself.

## What it is not

- No pre-built admin dashboard
- No managed hosting
- No opinion on your frontend component library

## Core ideas

| Concept               | Summary                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| **Zero pre-built UI** | You build the admin. better-cms provides the typed API client and hooks.                         |
| **Monorepo-first**    | Namespace and block definitions live in a shared package — both API and frontend import from it. |
| **Subpath exports**   | Each integration has its own import path. Only pay for what you use.                             |
| **4-tier fallback**   | Translations always resolve: memory → API → local JSON → raw key.                                |
| **Headless**          | No renderer, no schema enforcer for your UI. Just data.                                          |

## Documentation

- **Getting Started**
  - [Installation](./getting-started/installation.md)
  - [Quick Start](./getting-started/quick-start.md)
  - [Database Schema](./getting-started/database-schema.md)
- **Core Concepts**
  - [Architecture](./core-concepts/architecture.md)
  - [Namespaces & Markers](./core-concepts/namespaces.md)
  - [Locales](./core-concepts/locales.md)
  - [Fallback Strategy](./core-concepts/fallback-strategy.md)
  - [Caching](./core-concepts/caching.md)
  - [Plugin System](./core-concepts/plugins.md)
  - [Lifecycle & Events](./core-concepts/lifecycle.md)
- **Translations**
  - [Defining Namespaces](./translations/defining-namespaces.md)
  - [Using Translations](./translations/using-translations.md)
- **Pages**
  - [Defining Blocks](./pages/defining-blocks.md)
  - [Using Page Content](./pages/using-page-content.md)
- **Framework Adapters**
  - [Elysia](./framework-adapters/elysia.md)
  - [Next.js](./framework-adapters/next.md)
  - [TanStack Start](./framework-adapters/tanstack-start.md)
- **Database Adapters**
  - [Prisma](./database-adapters/prisma.md)
  - [Drizzle](./database-adapters/drizzle.md)
- **Storage Adapters**
  - [Overview](./storage-adapters/overview.md)
  - [AWS S3](./storage-adapters/aws-s3.md)
  - [Cloudflare R2](./storage-adapters/cloudflare-r2.md)
  - [Hetzner Object Storage](./storage-adapters/hetzner.md)
  - [Local Filesystem (Dev)](./storage-adapters/local.md)
- **Plugins**
  - [Pages Plugin](./plugins/pages-plugin.md)
  - [Media Plugin](./plugins/media-plugin.md)
  - [Fallback Plugin](./plugins/fallback-plugin.md)
  - [Fallback Sync Plugin](./plugins/fallback-sync-plugin.md)
- **Admin**
  - [Admin Client](./admin/admin-client.md)
  - [Admin Hooks (React)](./admin/admin-hooks.md)
  - [Building an Admin UI](./admin/building-admin-ui.md)
- **API Reference**
  - [Subpath Exports](./api-reference/exports.md)


---

[Installation →](getting-started/installation.md)
