# Hetzner Object Storage Adapter

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Endpoint](#endpoint)

## Installation

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Hetzner Object Storage is S3-compatible.

## Usage

```ts
import { hetznerS3Adapter } from "@modlog/better-cms/storage/hetzner";

hetznerS3Adapter({
  bucket: process.env.HETZNER_BUCKET!,
  region: process.env.HETZNER_REGION!, // e.g. "fsn1"
  credentials: {
    accessKeyId: process.env.HETZNER_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_SECRET_KEY!,
  },
  publicUrl: process.env.HETZNER_PUBLIC_URL!, // e.g. "https://your-bucket.fsn1.your-objectstorage.com"
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `bucket` | `string` | Bucket name |
| `region` | `string` | Hetzner region (`fsn1`, `nbg1`, `hel1`) |
| `credentials.accessKeyId` | `string` | S3-compatible access key |
| `credentials.secretAccessKey` | `string` | S3-compatible secret key |
| `publicUrl` | `string` | Public base URL for file access |

## Endpoint

The adapter uses the Hetzner S3-compatible endpoint: `https://{region}.your-objectstorage.com`.


---

[← Cloudflare R2 Adapter](cloudflare-r2.md) | [Local Storage Adapter (Dev Only) →](local.md)
