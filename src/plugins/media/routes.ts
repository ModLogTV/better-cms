import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSContext } from "../../core/plugin";
import { requirePermission } from "../../elysia/auth";

export function mediaRoutes(ctx: CMSContext) {
	return new Elysia()
		.use(requirePermission({ cms: ctx, permissions: [CMS_PERMISSIONS.MEDIA_UPLOAD] }))
		.post(
			"/media/presign",
			async ({ body }) => {
				if (!ctx.storage) {
					return { ok: false, error: "No storage adapter configured" };
				}
				const key = `${Date.now()}-${body.filename}`;
				const { uploadUrl, publicUrl } = await ctx.storage.presign({
					key,
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
		)
		.use(requirePermission({ cms: ctx, permissions: [CMS_PERMISSIONS.MEDIA_DELETE] }))
		.delete(
			"/media/:key",
			async ({ params }) => {
				if (!ctx.storage) {
					return { ok: false, error: "No storage adapter configured" };
				}
				await ctx.storage.delete({ key: params.key });
				return { ok: true };
			},
			{
				params: t.Object({ key: t.String() }),
			},
		);
}
