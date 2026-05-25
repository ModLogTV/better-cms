# Media Plugin

Adds a presigned upload URL endpoint to the CMS. Enables direct browser-to-storage uploads without routing binary data through the CMS API.

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
| `storage` | `CMSStorageAdapter` | Storage adapter to generate presigned URLs |

## Route added

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cms/media/presign` | Generate a presigned upload URL |

### Request body

```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 204800
}
```

### Response

```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "publicUrl": "https://cdn.example.com/photo.jpg"
}
```

## Upload flow

```
1. Admin UI: POST /cms/media/presign { filename, mimeType, size }
2. CMS API:  generate presigned URL via storage adapter
3. Admin UI: PUT uploadUrl (browser → storage directly, no API involvement)
4. Admin UI: store publicUrl in page block data
```

## Using from the admin client

```ts
const { uploadUrl, publicUrl } = await admin.media.presign({
  filename: "hero-image.png",
  mimeType: "image/png",
  size: file.size,
});

// Upload directly from the browser
await fetch(uploadUrl, { method: "PUT", body: file });

// Use publicUrl in your block data
await admin.pages.update({
  id: pageId,
  blocks: [{ type: "hero", data: { imageUrl: publicUrl } }],
});
```

## Using the React hook

```tsx
import { createAdminHooks } from "@modlog/better-cms/admin/react";

const { useMediaUpload } = createAdminHooks(admin);

function ImageUploader() {
  const { upload, isPending } = useMediaUpload();

  const handleFile = async (file: File) => {
    const { publicUrl } = await upload({ file });
    console.log("Uploaded to:", publicUrl);
  };

  return (
    <input
      type="file"
      disabled={isPending}
      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
    />
  );
}
```

`useMediaUpload` handles both the presign request and the PUT upload in a single `upload({ file })` call.


---

[← Pages Plugin](pages-plugin.md) | [Fallback Plugin →](fallback-plugin.md)
