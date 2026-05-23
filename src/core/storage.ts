export interface CMSStorageAdapter {
	presign(
		key: string,
		opts: { mimeType: string; size: number; ttl?: number },
	): Promise<{
		/** Presigned PUT URL — browser uploads direct, never proxied through cms-api */
		uploadUrl: string;
		/** {cdnUrl}/{key} — persisted in DB, used in block data */
		publicUrl: string;
	}>;
}
