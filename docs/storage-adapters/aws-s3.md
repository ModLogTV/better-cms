# AWS S3 Adapter

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [How it works](#how-it-works)
- [Bucket policy](#bucket-policy)

## Installation

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Usage

```ts
import { awsS3Adapter } from "@modlog/better-cms/storage/aws";

awsS3Adapter({
  bucket: process.env.S3_BUCKET!,
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  cdnUrl: process.env.CDN_URL!, // e.g. "https://cdn.example.com"
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `bucket` | `string` | S3 bucket name |
| `region` | `string` | AWS region (e.g. `"eu-central-1"`) |
| `credentials.accessKeyId` | `string` | AWS access key |
| `credentials.secretAccessKey` | `string` | AWS secret key |
| `cdnUrl` | `string` | Base URL for public file access (CloudFront or S3 public URL) |

## How it works

Generates a `PutObject` presigned URL using `@aws-sdk/s3-request-presigner`. The presigned URL expires in 300 seconds (5 minutes) by default. The `publicUrl` is constructed as `${cdnUrl}/${key}`.

## Bucket policy

The bucket must allow `s3:PutObject` for the configured credentials. For public file access, configure the bucket or CloudFront distribution to serve objects publicly.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CMSUpload",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```


---

[← Storage Adapters](overview.md) | [Cloudflare R2 Adapter →](cloudflare-r2.md)
