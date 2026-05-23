import type { CMSPlugin } from "../../core/plugin";
import type { CMSStorageAdapter } from "../../core/storage";
import { mediaRoutes } from "./routes";

/**
 * Adds `POST /cms/media/presign` route and wires a storage adapter into CMSContext.
 * Browser uploads directly to the presigned URL — binary data never passes through cms-api.
 */
export function mediaPlugin(opts: {
	storage: CMSStorageAdapter;
	cdnUrl?: string;
}): CMSPlugin {
	return {
		name: "media",
		init(ctx) {
			ctx.storage = opts.storage;
			ctx.elysiaApp.use(mediaRoutes(ctx));
		},
	};
}
