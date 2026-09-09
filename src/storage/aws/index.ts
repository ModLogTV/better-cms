import { S3Client } from "@aws-sdk/client-s3";
import { createS3Presigner } from "../s3-presign";

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
export function awsS3Adapter(opts: AWSS3Options) {
	const client = new S3Client({
		region: opts.region,
		credentials: opts.credentials,
	});
	return createS3Presigner({
		client,
		bucket: opts.bucket,
		cdnUrl: opts.cdnUrl,
	});
}
