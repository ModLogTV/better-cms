import {
	DeleteObjectCommand,
	PutObjectCommand,
	type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CMSStorageAdapter } from "../core/storage";

export function createS3Presigner(opts: {
	client: S3Client;
	bucket: string;
	cdnUrl: string;
}): CMSStorageAdapter {
	const { client, bucket, cdnUrl } = opts;
	// strip trailing slash so `${base}/${key}` never produces double slashes
	const base = cdnUrl.replace(/\/$/, "");
	return {
		async presign(opts) {
			const { key, mimeType, ttl = 300 } = opts;
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				ContentType: mimeType,
			});
			const uploadUrl = await getSignedUrl(client, command, { expiresIn: ttl });
			return { uploadUrl, publicUrl: `${base}/${key}` };
		},

		async delete({ key }) {
			const command = new DeleteObjectCommand({
				Bucket: bucket,
				Key: key,
			});
			await client.send(command);
		},
	};
}
