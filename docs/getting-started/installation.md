# Installation

## Recommended structure

better-cms is designed for **monorepos**. We recommend splitting your code into three parts to ensure type safety and clean separation of concerns:

```
monorepo/
├── apps/
│   ├── api/           # Backend (Elysia + Database)
│   └── web/           # Frontend (Next.js, React, etc.)
├── packages/
│   └── cms-config/    # Shared definitions (namespaces, blocks)
```

This ensures that both your API and your Web app import from the exact same TypeScript definitions.

## Package

```bash
bun add @modlog/better-cms
# or
npm install @modlog/better-cms
```

In a monorepo, install in every relevant workspace:

```bash
# Shared config package — defines namespaces and blocks
bun add @modlog/better-cms --filter @repo/cms-config

# API app — runs the CMS backend
bun add @modlog/better-cms --filter @repo/api

# Web app — consumes translations and page content
bun add @modlog/better-cms --filter @repo/web
```

## Peer dependencies

Install the peer dependencies relevant to your stack. Everything is optional except `zod` and `react`.

| Peer                                                   | Required for                                         |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `zod`                                                  | Page block schema validation                         |
| `react`                                                | `@modlog/better-cms/react` hooks                     |
| `@tanstack/react-query`                                | Admin hooks (`@modlog/better-cms/admin/react`)       |
| `elysia`                                               | `@modlog/better-cms/elysia` backend adapter          |
| `next`                                                 | `@modlog/better-cms/next` handler + middleware       |
| `@tanstack/start`                                      | `@modlog/better-cms/tanstack-start` server functions |
| `@prisma/client`                                       | `@modlog/better-cms/prisma` database adapter         |
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | AWS S3 storage adapter                               |

```bash
# Minimum for a Next.js + Prisma setup
bun add zod react @tanstack/react-query @prisma/client elysia next
```

## TypeScript

Requires TypeScript ≥ 5.0 and `"moduleResolution": "bundler"` or `"node16"` in `tsconfig.json` to resolve subpath exports.

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

## Node.js

Requires Node.js ≥ 20 (uses native `Intl.PluralRules`, `fetch`, `node:fs/promises`).


---

[← Home](../index.md) | [Quick Start →](quick-start.md)
