import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CMSStorageAdapter } from "../../core/storage";

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
	 * This is used to construct the final `publicUrl` returned after upload.
	 * Usually points to your Cloudflare custom domain or the R2 public bucket URL.
	 */
	cdnUrl: string;
}

/** Cloudflare R2 storage adapter. */
export function cloudflareR2Adapter(opts: R2Options): CMSStorageAdapter {
	const client = new S3Client({
		endpoint: opts.endpoint,
		region: "auto",
		credentials: opts.credentials,
	});

	return {
		async presign(key, { mimeType, ttl = 300 }) {
			const command = new PutObjectCommand({
				Bucket: opts.bucket,
				Key: key,
				ContentType: mimeType,
			});
			const uploadUrl = await getSignedUrl(client, command, { expiresIn: ttl });
			const publicUrl = `${opts.cdnUrl.replace(/\/$/, "")}/${key}`;
			return { uploadUrl, publicUrl };
		},
	};
}
