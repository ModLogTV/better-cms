import { S3Client } from "@aws-sdk/client-s3";
import { createS3Presigner } from "../s3-presign";

interface R2Options {
	bucket: string;
	/** https://[accountId].r2.cloudflarestorage.com */
	endpoint: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/**
	 * Base URL for public file access.
	 * Usually your Cloudflare custom domain or R2 public bucket URL.
	 */
	cdnUrl: string;
}

/** Cloudflare R2 storage adapter. */
export function cloudflareR2Adapter(opts: R2Options) {
	const client = new S3Client({
		endpoint: opts.endpoint,
		region: "auto",
		credentials: opts.credentials,
	});
	return createS3Presigner({ client, bucket: opts.bucket, cdnUrl: opts.cdnUrl });
}
