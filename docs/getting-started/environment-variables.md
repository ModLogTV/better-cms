# Environment Variables

- [Quick reference](#quick-reference)
- [Core](#core)
  - [`CMS_URL`](#cms_url)
- [Auth - token adapter](#auth-token-adapter)
  - [`CMS_READ_TOKEN`](#cms_read_token)
  - [`CMS_ADMIN_TOKEN`](#cms_admin_token)
- [Auth - better-auth](#auth-better-auth)
  - [`CMS_ADMIN_EMAIL`](#cms_admin_email)
  - [`CMS_ADMIN_PASSWORD`](#cms_admin_password)
  - [`CMS_SERVICE_TOKEN`](#cms_service_token)
- [Frontend client](#frontend-client)
  - [`NEXT_PUBLIC_CMS_URL`](#next_public_cms_url)
  - [`NEXT_PUBLIC_CMS_READ_TOKEN`](#next_public_cms_read_token)
- [Storage - AWS S3](#storage-aws-s3)
  - [`S3_BUCKET`](#s3_bucket)
  - [`S3_REGION`](#s3_region)
  - [`S3_ACCESS_KEY`](#s3_access_key)
  - [`S3_SECRET_KEY`](#s3_secret_key)
  - [`CDN_URL`](#cdn_url)
- [Storage - Cloudflare R2](#storage-cloudflare-r2)
  - [`R2_BUCKET`](#r2_bucket)
  - [`R2_ACCOUNT_ID`](#r2_account_id)
  - [`R2_ACCESS_KEY`](#r2_access_key)
  - [`R2_SECRET_KEY`](#r2_secret_key)
  - [`R2_PUBLIC_URL`](#r2_public_url)
- [Storage - Hetzner Object Storage](#storage-hetzner-object-storage)
  - [`HETZNER_BUCKET`](#hetzner_bucket)
  - [`HETZNER_REGION`](#hetzner_region)
  - [`HETZNER_ACCESS_KEY`](#hetzner_access_key)
  - [`HETZNER_SECRET_KEY`](#hetzner_secret_key)
  - [`HETZNER_PUBLIC_URL`](#hetzner_public_url)
- [Runtime](#runtime)
  - [`NODE_ENV`](#node_env)
  - [`NEXT_RUNTIME`](#next_runtime)
- [`.env` template](#env-template)

better-cms does not read environment variables directly - all configuration is passed as function arguments. The variable names below are **conventions** used in the docs and examples. You can name them however you like.

## Quick reference

| Variable | Used by | Required |
|---|---|---|
| `CMS_URL` | API server, admin client, fallback sync | Server |
| `CMS_READ_TOKEN` | `tokenAuthAdapter`, fallback sync, frontend client | Token auth only |
| `CMS_ADMIN_TOKEN` | `tokenAuthAdapter`, admin client | Token auth only |
| `CMS_SERVICE_TOKEN` | `betterAuthCMSAdapter` + frontend client | better-auth only |
| `CMS_ADMIN_EMAIL` | `initialAdminUser` | better-auth only |
| `CMS_ADMIN_PASSWORD` | `initialAdminUser` | better-auth only |
| `NEXT_PUBLIC_CMS_URL` | Next.js browser-side client | Next.js only |
| `NEXT_PUBLIC_CMS_READ_TOKEN` | Next.js browser-side client | Next.js + token auth |
| `S3_BUCKET` / `S3_REGION` / etc. | `awsS3Adapter` | AWS S3 only |
| `R2_BUCKET` / `R2_ACCOUNT_ID` / etc. | `cloudflareR2Adapter` | R2 only |
| `HETZNER_BUCKET` / `HETZNER_REGION` / etc. | `hetznerS3Adapter` | Hetzner only |
| `CDN_URL` | `awsS3Adapter` | AWS S3 only |
| `NODE_ENV` | `localStorageAdapter` guard | Runtime |
| `NEXT_RUNTIME` | `fallbackSyncPlugin` guard | Next.js only |

---

## Core

### `CMS_URL`

The base URL of your CMS API server. No trailing slash.

**Used by:**
- `createAdminClient({ cmsUrl: process.env.CMS_URL! })`
- `startFallbackSync({ cmsUrl: process.env.CMS_URL! })`
- `configureCMSClient({ cmsUrl: process.env.CMS_URL! })` (server-side)

```
CMS_URL=http://localhost:3001
# production:
CMS_URL=https://cms.internal.example.com
```

---

## Auth - token adapter

Used with `tokenAuthAdapter`. Skip if you use `betterAuthCMSAdapter`.

### `CMS_READ_TOKEN`

Token for read-only access. Grants: `translations:read`, `locales:read`, `pages:read`, `admin:read`.

**Used by:**
- `tokenAuthAdapter({ readToken: process.env.CMS_READ_TOKEN! })`
- `startFallbackSync({ readToken: process.env.CMS_READ_TOKEN! })`
- `configureCMSClient({ readToken: process.env.CMS_READ_TOKEN! })`

```
CMS_READ_TOKEN=<random-secret>
```

### `CMS_ADMIN_TOKEN`

Token for full admin access. Grants all CMS permissions (`cms:*`).

**Used by:**
- `tokenAuthAdapter({ adminToken: process.env.CMS_ADMIN_TOKEN! })`
- `createAdminClient({ token: process.env.CMS_ADMIN_TOKEN! })`

```
CMS_ADMIN_TOKEN=<different-random-secret>
```

> **Security:** Never expose `CMS_ADMIN_TOKEN` to the browser. Use `NEXT_PUBLIC_CMS_READ_TOKEN` for client-side code.

---

## Auth - better-auth

Used with `betterAuthCMSAdapter`. Skip if you use `tokenAuthAdapter`.

### `CMS_ADMIN_EMAIL`

Email address of the initial admin user. Upserted on CMS startup via `initialAdminUser`.

```
CMS_ADMIN_EMAIL=admin@example.com
```

### `CMS_ADMIN_PASSWORD`

Password for the initial admin user. Only used during first startup to create the account.

```
CMS_ADMIN_PASSWORD=<strong-password>
```

> Store in a secrets manager. After initial creation, the password can be changed via better-auth's account management.

### `CMS_SERVICE_TOKEN`

Optional static token for server-to-server reads (e.g. Next.js RSC fetching translations without a user session). Grants read-only permissions - same set as `CMS_READ_TOKEN`.

Set the same value on both the API server and the frontend client:

```
# API server (.env)
CMS_SERVICE_TOKEN=<random-secret>

# Frontend (.env)
CMS_READ_TOKEN=<same-random-secret>   # passed to configureCMSClient as readToken
```

```ts
// API: betterAuthCMSAdapter
betterAuthCMSAdapter({
  auth,
  prisma,
  serviceToken: process.env.CMS_SERVICE_TOKEN,
})

// Frontend: configureCMSClient
configureCMSClient({
  cmsUrl: process.env.CMS_URL!,
  readToken: process.env.CMS_SERVICE_TOKEN!,
})
```

---

## Frontend client

### `NEXT_PUBLIC_CMS_URL`

Public URL of the CMS server, exposed to the browser. Required for client-side rendering in Next.js.

```
NEXT_PUBLIC_CMS_URL=https://cms.example.com
```

> Only needed when `configureCMSClient` is called in browser context. In pure SSR setups, use `CMS_URL` (not `NEXT_PUBLIC_`).

### `NEXT_PUBLIC_CMS_READ_TOKEN`

Read-only token exposed to the browser for client-side translation fetches. With token auth this is `CMS_READ_TOKEN` exposed publicly. With better-auth this is `CMS_SERVICE_TOKEN`.

```
NEXT_PUBLIC_CMS_READ_TOKEN=<same-value-as-CMS_READ_TOKEN>
```

> This token is visible to end users. It should **only** grant read permissions.

---

## Storage - AWS S3

Used with `awsS3Adapter`. All five are required.

### `S3_BUCKET`

```
S3_BUCKET=my-cms-uploads
```

### `S3_REGION`

AWS region where the bucket is located.

```
S3_REGION=eu-central-1
```

### `S3_ACCESS_KEY`

IAM access key ID. The associated IAM user/role needs `s3:PutObject` and `s3:DeleteObject` on the bucket.

```
S3_ACCESS_KEY=AKIA...
```

### `S3_SECRET_KEY`

IAM secret access key.

```
S3_SECRET_KEY=<secret>
```

### `CDN_URL`

Base URL for serving uploaded files. Can be a CloudFront distribution or the direct S3 bucket URL.

```
CDN_URL=https://cdn.example.com
# or:
CDN_URL=https://my-cms-uploads.s3.eu-central-1.amazonaws.com
```

**Full setup:**

```ts
import { awsS3Adapter } from "better-cms/storage/aws"

awsS3Adapter({
  bucket: process.env.S3_BUCKET!,
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  cdnUrl: process.env.CDN_URL!,
})
```

---

## Storage - Cloudflare R2

Used with `cloudflareR2Adapter`. All five are required.

### `R2_BUCKET`

```
R2_BUCKET=my-cms-uploads
```

### `R2_ACCOUNT_ID`

Your Cloudflare account ID. Used to build the R2 endpoint URL (`https://<account-id>.r2.cloudflarestorage.com`).

```
R2_ACCOUNT_ID=abc123...
```

### `R2_ACCESS_KEY`

R2 API token access key ID (create under R2 → Manage API tokens).

```
R2_ACCESS_KEY=...
```

### `R2_SECRET_KEY`

R2 API token secret.

```
R2_SECRET_KEY=<secret>
```

### `R2_PUBLIC_URL`

Base URL for public file access. Use your Cloudflare custom domain or the R2 public bucket URL.

```
R2_PUBLIC_URL=https://assets.example.com
```

**Full setup:**

```ts
import { cloudflareR2Adapter } from "better-cms/storage/r2"

cloudflareR2Adapter({
  bucket: process.env.R2_BUCKET!,
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  cdnUrl: process.env.R2_PUBLIC_URL!,
})
```

---

## Storage - Hetzner Object Storage

Used with `hetznerS3Adapter`. All five are required.

### `HETZNER_BUCKET`

```
HETZNER_BUCKET=my-cms-uploads
```

### `HETZNER_REGION`

Hetzner datacenter region (e.g. `fsn1`, `nbg1`, `hel1`).

```
HETZNER_REGION=fsn1
```

### `HETZNER_ACCESS_KEY`

S3-compatible access key from Hetzner Cloud Console → Object Storage → Access Keys.

```
HETZNER_ACCESS_KEY=...
```

### `HETZNER_SECRET_KEY`

```
HETZNER_SECRET_KEY=<secret>
```

### `HETZNER_PUBLIC_URL`

Public URL base for served files.

```
HETZNER_PUBLIC_URL=https://my-cms-uploads.fsn1.your-objectstorage.com
```

**Full setup:**

```ts
import { hetznerS3Adapter } from "better-cms/storage/hetzner"

hetznerS3Adapter({
  bucket: process.env.HETZNER_BUCKET!,
  region: process.env.HETZNER_REGION!,
  endpoint: `https://${process.env.HETZNER_REGION!}.your-objectstorage.com`,
  credentials: {
    accessKeyId: process.env.HETZNER_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_SECRET_KEY!,
  },
  cdnUrl: process.env.HETZNER_PUBLIC_URL!,
})
```

---

## Runtime

### `NODE_ENV`

Standard Node.js environment variable. Not read by better-cms directly, but used in examples to guard `localStorageAdapter` from being used in production:

```ts
storage:
  process.env.NODE_ENV === "production"
    ? awsS3Adapter({ ... })
    : localStorageAdapter({ dir: "./uploads", baseUrl: "http://localhost:3000/media" })
```

### `NEXT_RUNTIME`

Set automatically by Next.js. Used in `instrumentation.ts` to guard `startFallbackSync` so it only runs in the Node.js runtime (not the Edge runtime):

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFallbackSync } = await import("better-cms/plugins/fallback-sync")
    await startFallbackSync({ ... })
  }
}
```

---

## `.env` template

Copy and fill in only the variables relevant to your setup:

```bash
# ── Core ────────────────────────────────────────────────
CMS_URL=http://localhost:3001

# ── Auth: token adapter (pick one auth strategy) ────────
CMS_READ_TOKEN=
CMS_ADMIN_TOKEN=

# ── Auth: better-auth ────────────────────────────────────
CMS_ADMIN_EMAIL=
CMS_ADMIN_PASSWORD=
CMS_SERVICE_TOKEN=

# ── Frontend client ──────────────────────────────────────
NEXT_PUBLIC_CMS_URL=http://localhost:3001
NEXT_PUBLIC_CMS_READ_TOKEN=   # same as CMS_READ_TOKEN or CMS_SERVICE_TOKEN

# ── Storage: AWS S3 ──────────────────────────────────────
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
CDN_URL=

# ── Storage: Cloudflare R2 ───────────────────────────────
R2_BUCKET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_PUBLIC_URL=

# ── Storage: Hetzner ─────────────────────────────────────
HETZNER_BUCKET=
HETZNER_REGION=
HETZNER_ACCESS_KEY=
HETZNER_SECRET_KEY=
HETZNER_PUBLIC_URL=
```

---

[← Installation](installation.md) | [Database Schema →](database-schema.md)
