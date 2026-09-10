# Media Plugin

- [Registration](#registration)
- [Options](#options)
- [Routes added](#routes-added)
- [Upload flow](#upload-flow)
- [Asset registry](#asset-registry)
- [Private bucket read URLs](#private-bucket-read-urls)
- [Presign request body](#presign-request-body)
- [Presign response](#presign-response)
- [Using from the admin client](#using-from-the-admin-client)
  - [`admin.media.list()`](#adminmedialist)
  - [`admin.media.upload({ file, body })`](#adminmediaupload-file-body)
  - [`admin.media.getReadUrl({ key })`](#adminmediagetreadurl-key)
  - [`admin.media.delete({ key })`](#adminmediadelete-key)
- [Using the React hooks](#using-the-react-hooks)

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

Every route below except `/cms/media/public/:key` requires at least `cms:media:view` - it's the hard baseline for opening the media library at all, and there's no tag-scoped grant that bypasses it. Routes marked "view / tag" also accept a tag-scoped grant (see [Tag-scoped permissions](#tag-scoped-permissions)) in place of the listed global permission, evaluated against the tags the target asset actually carries; untagged assets are governed purely by the global permission.

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/cms/media?tagIds=a,b&tagOperator=AND\|OR` | `cms:media:view` | List assets, optionally filtered by tags (`AND` = every tag, `OR` = any one - default `AND`). Narrowed to what the caller can see unless they hold `cms:admin:read` |
| `GET` | `/cms/media/tags` | `cms:media:view` | List all tags |
| `GET` | `/cms/media/views` | `cms:media:view` | List saved tag-filter views |
| `GET` | `/cms/media/:key/url` | `cms:media:view` | Get a read URL (presigned or public) for an asset |
| `GET` | `/cms/media/:id/versions` | `cms:media:view` | Version history for an asset, newest first |
| `GET` | `/cms/media/versions/:versionId` | `cms:media:view` | A single version's full snapshot |
| `POST` | `/cms/media/:id/publish` | `cms:media:upload` / tag `publish` | Marks the asset's latest version as published |
| `PATCH` | `/cms/media/:id` | `cms:media:upload` / tag `edit` | Metadata edit - creates a new version (`{ metadata }`) |
| `POST` | `/cms/media/:id/restore` | `cms:media:upload` / tag `edit` | Copies a past version into a new draft version (`{ versionId }`) |
| `PUT` | `/cms/media/:id/tags` | `cms:media:upload` / tag `edit` | Replace an asset's full tag set (`{ tagIds }`) |
| `DELETE` | `/cms/media/:key` | `cms:media:delete` / tag `delete` | Delete a file from storage and the asset registry |
| `POST` | `/cms/media/presign` | `cms:media:upload` | Generate a presigned upload URL and register the asset |
| `POST` | `/cms/media/:assetId/confirm` | `cms:media:upload` | Mark an asset upload as completed |
| `POST` | `/cms/media/tags` | `cms:media:tag-manage` | Create a tag (`{ name }`) |
| `DELETE` | `/cms/media/tags/:id` | `cms:media:tag-manage` | Delete a tag |
| `GET` | `/cms/media/tags/:id/grants` | `cms:media:tag-manage` | List access grants for a tag |
| `POST` | `/cms/media/tags/:id/grants` | `cms:media:tag-manage` | Add a tag-scoped grant (`{ subjectType, subjectId, permission }`) |
| `DELETE` | `/cms/media/tag-grants/:id` | `cms:media:tag-manage` | Remove a tag-scoped grant |
| `POST` | `/cms/media/views` | `cms:media:view` | Save a tag-filter combination (`{ name, operator, tagIds }`) |
| `DELETE` | `/cms/media/views/:id` | `cms:media:view` | Delete a saved view |
| `GET` | `/cms/media/public/:key` | none | Redirects to the file **only if published** - the public-facing counterpart to the admin routes above |

## Tag-scoped permissions

On top of the flat, global `cms:media:*` permissions, a user or group can be granted access scoped to one or more tags - additive on top of whatever global permissions they already hold, never a restriction. `cms:media:view` itself is never grantable per-tag; it's a hard prerequisite checked before any route (including tag-scoped ones) runs at all.

```ts
type MediaTagAction = "view" | "upload" | "edit" | "delete" | "publish";

interface MediaTagGrant {
  id: string;
  tagId: string;
  subjectType: "user" | "group";
  subjectId: string;
  permission: MediaTagAction;
}
```

- A caller can act on a tagged asset if they hold a matching grant on **any one** of its tags (OR logic across the asset's tags, not AND).
- Untagged assets are governed solely by the global `cms:media:upload` / `cms:media:delete` permissions - there's no tag to scope a grant to.
- Uploading without a tag is allowed for anyone with upload access (global or tag-scoped); tagging at upload time is never required.
- Tag CRUD (create/delete) and grant management both require `cms:media:tag-manage`, which is distinct from *assigning* an existing tag to an asset (`PUT /cms/media/:id/tags`), which only needs edit/upload access to that asset - tags double as an access boundary, so managing the boundary itself is a separate, narrower permission.

## Tags and saved views

Media uses flat tags (no folders/hierarchy) - an asset can carry any number of them. The admin UI's media library filters by one or more tags (AND/OR), and a chosen combination can be saved as a named, shareable view for quick re-selection, similar to Paperless-ngx.

```ts
interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}

interface SavedView {
  id: string;
  name: string;
  ownerId: string | null;
  operator: "AND" | "OR";
  tagIds: string[];
  createdAt: Date;
}
```

## Publishing and version history

Like pages, media has its own draft/published lifecycle, independent of any page referencing it. Every metadata edit and every file replacement (passing `key`/`filename`/`mimeType`/`size`/`publicUrl` to `PATCH /cms/media/:id`) creates a new append-only `MediaVersion`; `POST /cms/media/:id/publish` marks the latest version as the published one. Status is derived: `draft` (never published), `published` (published version matches the latest), or `published` with unpublished changes pending (latest differs from what's published).

Draft/unpublished versions are never exposed via `GET /cms/media/public/:key` - only the currently published version is publicly reachable there. Draft content remains fully visible to authorized admins via the routes above. If you reference media in your frontend and want it to respect draft/publish state, link to `/cms/media/public/:key` instead of the asset's raw `publicUrl` - the latter is a direct storage URL and isn't gated by this CMS at all (see [Storage Adapters](../storage-adapters/overview.md)).

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
  status: "draft" | "published" | "modified"; // derived from version history
  metadata: Record<string, unknown>; // latest version's metadata snapshot
  tagIds: string[];
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
