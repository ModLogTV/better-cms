# Storage Adapters

Storage adapters handle media file uploads. They are used exclusively by `mediaPlugin`.

## How it works

1. The admin calls `POST /cms/media/presign` with `{ filename, mimeType, size }`
2. The API generates a **presigned URL** pointing directly to your storage bucket
3. The browser uploads the file directly to storage — the binary never passes through the CMS API
4. The API returns the final `publicUrl` for use in your content

This pattern keeps the CMS API small and avoids memory pressure from streaming large files.

## CMSStorageAdapter interface

```ts
interface CMSStorageAdapter {
  presign(opts: {
    key: string;
    mimeType: string;
    ttl?: number;
  }): Promise<{ uploadUrl: string; publicUrl: string }>;
}
```

`key` is the storage path/filename. `ttl` is the presigned URL expiry in seconds (default varies by adapter).

## Available adapters

| Adapter | Import | Provider |
|---------|--------|---------|
| `awsS3Adapter` | `@modlog/better-cms/storage/aws` | AWS S3 |
| `cloudflareR2Adapter` | `@modlog/better-cms/storage/r2` | Cloudflare R2 |
| `hetznerS3Adapter` | `@modlog/better-cms/storage/hetzner` | Hetzner Object Storage |
| `localStorageAdapter` | `@modlog/better-cms/storage/local` | Local filesystem (dev only) |

## Registering a storage adapter

Pass the adapter to `mediaPlugin`:

```ts
import { mediaPlugin } from "@modlog/better-cms/plugins/media";
import { awsS3Adapter } from "@modlog/better-cms/storage/aws";

plugins: [
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
]
```

## Custom adapter

Implement `CMSStorageAdapter` from `@modlog/better-cms`:

```ts
import type { CMSStorageAdapter } from "@modlog/better-cms";

export const myAdapter: CMSStorageAdapter = {
  async presign({ key, mimeType, ttl = 300 }) {
    const uploadUrl = await generatePresignedUrl(key, mimeType, ttl);
    const publicUrl = `https://cdn.example.com/${key}`;
    return { uploadUrl, publicUrl };
  },
};
```


---

[← Drizzle Adapter](../database-adapters/drizzle.md) | [AWS S3 Adapter →](aws-s3.md)
