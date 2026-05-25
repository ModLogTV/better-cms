# Cloudflare R2 Adapter

## Installation

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

R2 is S3-compatible, so it uses the same AWS SDK.

## Usage

```ts
import { cloudflareR2Adapter } from "@modlog/better-cms/storage/r2";

cloudflareR2Adapter({
  bucket: process.env.R2_BUCKET!,
  accountId: process.env.R2_ACCOUNT_ID!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  publicUrl: process.env.R2_PUBLIC_URL!, // e.g. "https://assets.example.com"
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `bucket` | `string` | R2 bucket name |
| `accountId` | `string` | Cloudflare account ID |
| `credentials.accessKeyId` | `string` | R2 access key ID |
| `credentials.secretAccessKey` | `string` | R2 secret access key |
| `publicUrl` | `string` | Public base URL (R2 custom domain or `pub-*.r2.dev`) |

## R2 API endpoint

The adapter connects to `https://{accountId}.r2.cloudflarestorage.com` using the S3-compatible API.

## Public access

Enable "Public Access" on your R2 bucket in the Cloudflare dashboard, or configure a custom domain. The `publicUrl` must match your public domain.


---

[← AWS S3 Adapter](aws-s3.md) | [Hetzner Object Storage Adapter →](hetzner.md)
