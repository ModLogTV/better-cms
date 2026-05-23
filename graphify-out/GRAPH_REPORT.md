# Graph Report - .  (2026-05-23)

## Corpus Check
- Corpus is ~11,926 words - fits in a single context window. You may not need a graph.

## Summary
- 338 nodes · 759 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Translation fallback key stri|Translation fallback: key stri]]
- [[_COMMUNITY_admin, adminreact, author, cl|admin, admin/react, author, cl]]
- [[_COMMUNITY_describeNamespace(), walk(), A|describeNamespace(), walk(), A]]
- [[_COMMUNITY_awsS3(), AWSS3Options, Block V|awsS3(), AWSS3Options, Block V]]
- [[_COMMUNITY_cache, deleteCached(), getCach|cache, deleteCached(), getCach]]
- [[_COMMUNITY_source, assist, actions, files|source, assist, actions, files]]
- [[_COMMUNITY_admin.test.ts, media.test.ts,|admin.test.ts, media.test.ts, ]]
- [[_COMMUNITY_editor.codeActionsOnSave, sour|editor.codeActionsOnSave, sour]]
- [[_COMMUNITY_compilerOptions, declaration,|compilerOptions, declaration, ]]
- [[_COMMUNITY_scripts, build, buildwatch, c|scripts, build, build:watch, c]]
- [[_COMMUNITY_Locale detection cookie → Acc|Locale detection: cookie → Acc]]
- [[_COMMUNITY_fallbackPlugin(), index.ts, fa|fallbackPlugin(), index.ts, fa]]
- [[_COMMUNITY_tsup build configuration, brow|tsup build configuration, brow]]
- [[_COMMUNITY_subpath exports architecture —|subpath exports architecture —]]
- [[_COMMUNITY_ALL_PEER_DEPS, shared, tsup.co|ALL_PEER_DEPS, shared, tsup.co]]
- [[_COMMUNITY_AGENTS.md agent rules, better-|AGENTS.md agent rules, better-]]
- [[_COMMUNITY_BlockDefinition, BlockUnion|BlockDefinition, BlockUnion]]
- [[_COMMUNITY_better-cms README|better-cms README]]
- [[_COMMUNITY_loadTranslations|loadTranslations]]
- [[_COMMUNITY_loadPageContent|loadPageContent]]
- [[_COMMUNITY_i18nindex (barrel)|i18n/index (barrel)]]

## God Nodes (most connected - your core abstractions)
1. `exports` - 21 edges
2. `import` - 21 edges
3. `require` - 20 edges
4. `typesVersions` - 19 edges
5. `CMSStorageAdapter` - 16 edges
6. `CMSPlugin` - 13 edges
7. `RawBlock` - 13 edges
8. `CMSAdapter` - 13 edges
9. `NamespaceDefinition` - 11 edges
10. `compilerOptions` - 10 edges

## Surprising Connections (you probably didn't know these)
- `eventually consistent cache invalidation (max 60s stale)` --rationale_for--> `getCached()`  [INFERRED]
  /Users/daniel/Programmieren/Work/Freelance/ModLog/better-cms/CLAUDE.md → src/client/cache.ts
- `no pre-built UI — export handlers, hooks, and typed clients only` --rationale_for--> `createAdminHooks()`  [EXTRACTED]
  /Users/daniel/Programmieren/Work/Freelance/ModLog/better-cms/CLAUDE.md → src/admin-react/index.ts
- `createServerFns()` --semantically_similar_to--> `useTranslations()`  [INFERRED] [semantically similar]
  src/tanstack/index.ts → src/react/hooks.ts
- `translation fallback chain: API → locale JSON → English JSON → key string` --rationale_for--> `FallbackLoader`  [EXTRACTED]
  /Users/daniel/Programmieren/Work/Freelance/ModLog/better-cms/CLAUDE.md → src/client/config.ts
- `hetznerS3` --implements--> `Presigned Upload Pattern`  [INFERRED]
  /Users/daniel/Programmieren/Work/Freelance/ModLog/better-cms/src/storage/hetzner/index.ts → src/plugins/media/routes.ts

## Communities (21 total, 7 thin omitted)

### Community 0 - "Translation fallback: key stri"
Cohesion: 0.08
Nodes (53): Translation fallback: key string as last resort, key, KeyMarker, plural(), PluralMarker, rich(), RichMarker, vars() (+45 more)

### Community 1 - "admin, admin/react, author, cl"
Cohesion: 0.10
Nodes (51): admin, admin/react, author, client, description, devDependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+43 more)

### Community 2 - "describeNamespace(), walk(), A"
Cohesion: 0.10
Nodes (32): describeNamespace(), walk(), AdminClientOptions, apiFetch(), CMSError, createAdminClient(), AdminQueryProvider(), createAdminHooks() (+24 more)

### Community 3 - "awsS3(), AWSS3Options, Block V"
Cohesion: 0.10
Nodes (30): awsS3(), AWSS3Options, Block Validation via Zod, CMS Plugin Architecture, presigned PUT URL for browser-direct S3 uploads, Presigned Upload Pattern, internal token authentication (x-internal-token header), CMSContext (+22 more)

### Community 4 - "cache, deleteCached(), getCach"
Cohesion: 0.14
Nodes (21): cache, deleteCached(), getCached(), setCached(), CMSClientConfig, configureCMSClient(), FallbackLoader, getClientConfig() (+13 more)

### Community 5 - "source, assist, actions, files"
Cohesion: 0.13
Nodes (18): source, assist, actions, files, ignoreUnknown, formatter, indentStyle, quoteStyle (+10 more)

### Community 6 - "admin.test.ts, media.test.ts, "
Cohesion: 0.15
Nodes (11): app, makeAdapter(), makePage(), req(), app, body, storage, adapter (+3 more)

### Community 7 - "editor.codeActionsOnSave, sour"
Cohesion: 0.26
Nodes (12): editor.codeActionsOnSave, source.fixAll.biome, source.organizeImports.biome, editor.defaultFormatter, editor.formatOnSave, [javascript], [javascriptreact], [json] (+4 more)

### Community 8 - "compilerOptions, declaration, "
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, jsx, lib, module, moduleResolution, skipLibCheck, strict (+2 more)

### Community 9 - "scripts, build, build:watch, c"
Cohesion: 0.22
Nodes (9): scripts, build, build:watch, check, format, lint, prebuild, test (+1 more)

### Community 10 - "Locale detection: cookie → Acc"
Cohesion: 0.33
Nodes (5): Locale detection: cookie → Accept-Language → default, toNextHandler(), createNextMiddleware(), NextMiddlewareOptions, result

### Community 11 - "fallbackPlugin(), index.ts, fa"
Cohesion: 0.40
Nodes (4): fallbackPlugin(), events, OUTPUT_DIR, plugin

### Community 12 - "tsup build configuration, brow"
Cohesion: 0.50
Nodes (4): tsup build configuration, browser platform group (next-client, ESM only, use client banner), neutral platform group (core, i18n, client, admin), node platform group (elysia, prisma, next, tanstack, storage, plugins)

### Community 13 - "subpath exports architecture —"
Cohesion: 0.67
Nodes (3): subpath exports architecture — single package, no sub-packages, zero runtime dependencies — peer deps only, better-cms package

## Knowledge Gaps
- **115 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaClient` connect `admin, admin/react, author, cl` to `describeNamespace(), walk(), A`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _124 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Translation fallback: key stri` be split into smaller, more focused modules?**
  _Cohesion score 0.07505827505827506 - nodes in this community are weakly interconnected._
- **Should `admin, admin/react, author, cl` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._
- **Should `describeNamespace(), walk(), A` be split into smaller, more focused modules?**
  _Cohesion score 0.10289115646258504 - nodes in this community are weakly interconnected._
- **Should `awsS3(), AWSS3Options, Block V` be split into smaller, more focused modules?**
  _Cohesion score 0.10409745293466224 - nodes in this community are weakly interconnected._
- **Should `cache, deleteCached(), getCach` be split into smaller, more focused modules?**
  _Cohesion score 0.1354679802955665 - nodes in this community are weakly interconnected._