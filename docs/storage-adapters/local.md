# Local Storage Adapter (Dev Only)

Stores files on the local filesystem and serves them via a static file URL. **Do not use in production.**
> If you want to use a self-hosted object storage system like MinIO for production, use [AWS S3 Documentation](./aws-s3.md)

## Usage

```ts
import { localStorageAdapter } from "@modlog/better-cms/storage/local";
import { join } from "node:path";

localStorageAdapter({
  dir: join(process.cwd(), "uploads"),
  baseUrl: "http://localhost:3001/uploads",
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `dir` | `string` | Absolute path to write files to |
| `baseUrl` | `string` | Public base URL where files are served |

## How it works

The adapter writes files directly to `dir/{key}` and returns `baseUrl/{key}` as the `publicUrl`. Unlike cloud adapters, there is no real presigned URL — the `uploadUrl` is a local endpoint.

You must serve the `dir` folder statically in your dev API. With Elysia:

```ts
import { staticPlugin } from "@elysiajs/static";

new Elysia()
  .use(staticPlugin({ assets: "uploads", prefix: "/uploads" }))
  .use(toElysiaPlugin(cms))
  .listen(3001);
```

## Switching adapters by environment

```ts
import { awsS3Adapter } from "@modlog/better-cms/storage/aws";
import { localStorageAdapter } from "@modlog/better-cms/storage/local";

const storage =
  process.env.NODE_ENV === "production"
    ? awsS3Adapter({ ... })
    : localStorageAdapter({ dir: "./uploads", baseUrl: "http://localhost:3001/uploads" });

plugins: [
  mediaPlugin({ storage }),
]
```
