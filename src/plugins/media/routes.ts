import { Elysia, t } from "elysia";
import type { CMSContext } from "../../core/plugin";
import { requireFullToken } from "../../elysia/auth";

export function mediaRoutes(ctx: CMSContext) {
	return new Elysia().use(requireFullToken(ctx)).post(
		"/media/presign",
		async ({ body }) => {
			if (!ctx.storage) {
				return { ok: false, error: "No storage adapter configured" };
			}
			const key = `${Date.now()}-${body.filename}`;
			const { uploadUrl, publicUrl } = await ctx.storage.presign(key, {
				mimeType: body.mimeType,
				size: body.size,
			});
			return { uploadUrl, publicUrl };
		},
		{
			body: t.Object({
				filename: t.String(),
				mimeType: t.String(),
				size: t.Number(),
			}),
		},
	);
}
