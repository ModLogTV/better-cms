import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CMSStorageAdapter } from "../../core/storage";

interface LocalStorageOptions {
	/** Absolute path to store uploaded files */
	dir: string;
	/** Base URL where files are served, e.g. http://localhost:3000/media */
	baseUrl: string;
}

/**
 * Local filesystem storage adapter — dev only.
 * Files are written directly to disk; no presigning.
 * Never use in production.
 */
export function localStorageAdapter(
	opts: LocalStorageOptions,
): CMSStorageAdapter {
	return {
		async presign(presignOpts) {
			const { key } = presignOpts;
			await mkdir(opts.dir, { recursive: true });
			const filePath = join(opts.dir, key);
			// Write an empty placeholder so the path exists; actual content written on PUT
			await writeFile(filePath, "");
			const uploadUrl = `${opts.baseUrl}/upload?key=${encodeURIComponent(key)}`;
			const publicUrl = `${opts.baseUrl}/${key}`;
			return { uploadUrl, publicUrl };
		},
	};
}
