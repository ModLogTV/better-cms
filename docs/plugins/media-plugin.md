# Media Plugin

Adds media management routes to the CMS. Enables direct browser-to-storage uploads and file deletion.

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

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cms/media/presign` | Generate a presigned upload URL |
| `DELETE` | `/cms/media/:key` | Delete a file from storage |

### Presign Request body

```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 204800
}
```

### Presign Response

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

### `admin.media.upload({ file, body })`

The recommended way to upload. Handles the full flow automatically.

```ts
const { publicUrl } = await admin.media.upload({
  file: { name: "hero.png", type: "image/png", size: file.size },
  body: file,
});
```

### `admin.media.delete({ key })`

```ts
await admin.media.delete({ key: "123-hero.png" });
```

## Using the React hooks

```tsx
import { createAdminHooks } from "@modlog/better-cms/admin/react";

const { useMediaUpload, useMediaDelete } = createAdminHooks(admin);

function ImageManager() {
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
      <button onClick={() => remove({ key: "..." })}>Delete</button>
    </div>
  );
}
```

`useMediaUpload` handles both the presign request and the PUT upload in a single `upload({ file })` call.


---

[← Pages Plugin](pages-plugin.md) | [Fallback Plugin →](fallback-plugin.md)
