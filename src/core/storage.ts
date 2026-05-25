export interface CMSStorageAdapter {
	presign(opts: {
		key: string;
		mimeType: string;
		size: number;
		ttl?: number;
	}): Promise<{
		/** Presigned PUT URL — browser uploads direct, never proxied through cms-api */
		uploadUrl: string;
		/** {cdnUrl}/{key} — persisted in DB, used in block data */
		publicUrl: string;
	}>;
}
