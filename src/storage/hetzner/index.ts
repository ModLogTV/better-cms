import { S3Client } from "@aws-sdk/client-s3";
import { createS3Presigner } from "../s3-presign";

interface HetznerS3Options {
	bucket: string;
	/** e.g. https://fsn1.your-objectstorage.com */
	endpoint: string;
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/** Base URL for public file access (CDN or direct bucket URL) */
	cdnUrl: string;
}

/** Hetzner Object Storage adapter (S3-compatible). */
export function hetznerS3Adapter(opts: HetznerS3Options) {
	const client = new S3Client({
		endpoint: opts.endpoint,
		region: opts.region,
		credentials: opts.credentials,
		forcePathStyle: true,
	});
	return createS3Presigner(client, opts.bucket, opts.cdnUrl);
}
