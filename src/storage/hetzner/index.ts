import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CMSStorageAdapter } from "../../core/storage";

interface HetznerS3Options {
	bucket: string;
	/** e.g. https://fsn1.your-objectstorage.com */
	endpoint: string;
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/** Base URL for public file access (your CDN or direct bucket URL) */
	cdnUrl: string;
}

/**
 * Hetzner Object Storage adapter (S3-compatible).
 * Uses presigned PUT URLs — browser uploads direct, never proxied.
 */
export function hetznerS3Adapter(opts: HetznerS3Options): CMSStorageAdapter {
	const client = new S3Client({
		endpoint: opts.endpoint,
		region: opts.region,
		credentials: opts.credentials,
		forcePathStyle: true,
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
