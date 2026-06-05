# Media Plugin

Adds media management routes to the CMS. Enables direct browser-to-storage uploads, a persisted asset registry, and file deletion.

## Registration

```ts
import { mediaPlugin } from "@modlog/better-cms/plugins/media";
import { awsS3Adapter } from "@modlog/better-cms/storage/aws";

const cms = createCMS({
  // ...
  plugins: [
    mediaPlugin({
      storage: awsS3Adapter({ ... }),
    }),
  ],
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `storage` | `CMSStorageAdapter` | Storage adapter for file operations |

## Routes added

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/cms/media` | `cms:admin:read` | List all recorded media assets |
| `POST` | `/cms/media/presign` | `cms:media:upload` | Generate a presigned upload URL and register the asset |
| `POST` | `/cms/media/:assetId/confirm` | `cms:media:upload` | Mark an asset upload as completed |
| `GET` | `/cms/media/:key/url` | `cms:admin:read` | Get a read URL (presigned or public) for an asset |
| `DELETE` | `/cms/media/:key` | `cms:media:delete` | Delete a file from storage and the asset registry |

## Upload flow

```
1. Admin UI: POST /cms/media/presign { filename, mimeType, size }
2. CMS API:  generate presigned URL, record MediaAsset (confirmedAt: null)
3. Admin UI: PUT uploadUrl (browser → storage directly, no API involvement)
4. Admin UI: POST /cms/media/:assetId/confirm
5. CMS API:  set confirmedAt = now()
```

The high-level `admin.media.upload()` helper performs all five steps automatically.

## Asset registry

Every `POST /cms/media/presign` call writes a `MediaAsset` row to the database. Assets are initially **unconfirmed** (`confirmedAt: null`). The confirm step marks them as completed. Unconfirmed assets (browser navigated away before uploading) can be pruned based on `createdAt`.

```ts
interface MediaAsset {
  id: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  uploadedBy?: string;  // userId if using betterAuthCMSAdapter
  confirmedAt: Date | null;
  createdAt: Date;
}
```

## Private bucket read URLs

For private S3 buckets, use `GET /cms/media/:key/url` to obtain a short-lived signed GET URL instead of accessing `publicUrl` directly.

All S3-based adapters (`awsS3Adapter`, `cloudflareR2Adapter`, `hetznerS3Adapter`) implement `presignRead` and return a 1-hour signed URL. `localStorageAdapter` returns the plain `baseUrl` path. Custom adapters can implement the optional `presignRead` method:

```ts
interface CMSStorageAdapter {
  // ...
  presignRead?(opts: { key: string; ttl?: number }): Promise<{ url: string }>;
}
```

When `presignRead` is not implemented, the endpoint falls back to returning the stored `publicUrl`.

## Presign request body

```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 204800
}
```

## Presign response

```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "publicUrl": "https://cdn.example.com/1234567890-photo.jpg",
  "assetId": "clx..."
}
```

## Using from the admin client

### `admin.media.list()`

```ts
const assets = await admin.media.list();
// MediaAsset[]
```

### `admin.media.upload({ file, body })`

The recommended way to upload. Handles the full flow automatically (presign → PUT → confirm).

```ts
const { publicUrl, assetId } = await admin.media.upload({
  file: { name: "hero.png", type: "image/png", size: file.size },
  body: file,
});
```

### `admin.media.getReadUrl({ key })`

```ts
const { url } = await admin.media.getReadUrl({ key: "1234-hero.png" });
// Short-lived signed URL (or publicUrl for public buckets)
```

### `admin.media.delete({ key })`

Removes the file from storage and deletes the asset registry row.

```ts
await admin.media.delete({ key: "1234567890-hero.png" });
```

## Using the React hooks

```tsx
import { createAdminHooks } from "@modlog/better-cms/admin/react";

const { useMediaList, useMediaUpload, useMediaDelete } = createAdminHooks(admin);

function ImageManager() {
  const { data: assets } = useMediaList();
  const { upload, isPending } = useMediaUpload();
  const { mutate: remove } = useMediaDelete();

  const handleFile = async (file: File) => {
    const { publicUrl } = await upload({ file });
    console.log("Uploaded to:", publicUrl);
  };

  return (
    <div>
      <input
        type="file"
        disabled={isPending}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {assets?.map((asset) => (
        <div key={asset.id}>
          <img src={asset.publicUrl} alt={asset.filename} />
          <button onClick={() => remove({ key: asset.key })}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

`useMediaUpload` invalidates the `["cms", "media"]` query key on settle.
`useMediaDelete` invalidates the same key.


---

[← Pages Plugin](pages-plugin.md) | [Fallback Plugin →](fallback-plugin.md)
