export interface CMSStorageAdapter {
	presign(opts: {
		key: string;
		mimeType: string;
		size: number;
		ttl?: number;
	}): Promise<{
		/** Presigned PUT URL - browser uploads direct, never proxied through cms-api */
		uploadUrl: string;
		/** {cdnUrl}/{key} - persisted in DB, used in block data */
		publicUrl: string;
	}>;

	/** Permanently removes a file from storage. */
	delete(opts: { key: string }): Promise<void>;

	/**
	 * Generates a short-lived presigned GET URL for private buckets.
	 * Optional - only needed when the bucket is not publicly readable.
	 * Falls back to the stored `publicUrl` when not implemented.
	 */
	presignRead?(opts: { key: string; ttl?: number }): Promise<{ url: string }>;
}
