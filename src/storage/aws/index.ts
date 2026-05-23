import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CMSStorageAdapter } from "../../core/storage";

interface AWSS3Options {
	bucket: string;
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/** CloudFront or S3 public URL base */
	cdnUrl: string;
}

/** AWS S3 storage adapter. */
export function awsS3Adapter(opts: AWSS3Options): CMSStorageAdapter {
	const client = new S3Client({
		region: opts.region,
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
