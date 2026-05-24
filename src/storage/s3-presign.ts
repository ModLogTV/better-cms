import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CMSStorageAdapter } from "../core/storage";

export function createS3Presigner(
	client: S3Client,
	bucket: string,
	cdnUrl: string,
): CMSStorageAdapter {
	// strip trailing slash so `${base}/${key}` never produces double slashes
	const base = cdnUrl.replace(/\/$/, "");
	return {
		async presign(key, { mimeType, ttl = 300 }) {
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				ContentType: mimeType,
			});
			const uploadUrl = await getSignedUrl(client, command, { expiresIn: ttl });
			return { uploadUrl, publicUrl: `${base}/${key}` };
		},
	};
}
