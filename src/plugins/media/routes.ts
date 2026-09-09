import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSContext } from "../../core/plugin";
import { requirePermission } from "../../elysia/auth";

export function mediaRoutes(ctx: CMSContext) {
	return new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.ADMIN_READ],
			}),
		)
		.get("/media", async ({ cmsUserId: _u }) => {
			return ctx.adapter.listMediaAssets();
		})
		.get(
			"/media/:key/url",
			async ({ params, set }) => {
				if (!ctx.storage) {
					set.status = 503;
					return { error: "No storage adapter configured" };
				}
				const assets = await ctx.adapter.listMediaAssets();
				const asset = assets.find((a) => a.key === params.key);
				if (!asset) {
					set.status = 404;
					return { error: "Asset not found" };
				}
				if (ctx.storage.presignRead) {
					const { url } = await ctx.storage.presignRead({ key: params.key });
					return { url };
				}
				return { url: asset.publicUrl };
			},
			{ params: t.Object({ key: t.String() }) },
		)
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_UPLOAD],
			}),
		)
		.post(
			"/media/presign",
			async ({ body, cmsUserId }) => {
				if (!ctx.storage) {
					return { ok: false, error: "No storage adapter configured" };
				}
				const key = `${Date.now()}-${body.filename}`;
				const { uploadUrl, publicUrl } = await ctx.storage.presign({
					key,
					mimeType: body.mimeType,
					size: body.size,
				});
				const id = crypto.randomUUID();
				const asset = await ctx.adapter.createMediaAsset({
					id,
					key,
					filename: body.filename,
					mimeType: body.mimeType,
					size: body.size,
					publicUrl,
					uploadedBy: cmsUserId,
				});
				return { uploadUrl, publicUrl, assetId: asset.id };
			},
			{
				body: t.Object({
					filename: t.String(),
					mimeType: t.String(),
					size: t.Number(),
				}),
			},
		)
		.post(
			"/media/:assetId/confirm",
			async ({ params, set }) => {
				await ctx.adapter.confirmMediaAsset({ id: params.assetId });
				set.status = 204;
			},
			{ params: t.Object({ assetId: t.String() }) },
		)
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_DELETE],
			}),
		)
		.delete(
			"/media/:key",
			async ({ params, set }) => {
				if (!ctx.storage) {
					set.status = 503;
					return { error: "No storage adapter configured" };
				}
				await Promise.all([
					ctx.storage.delete({ key: params.key }),
					ctx.adapter.deleteMediaAsset({ key: params.key }),
				]);
				return { ok: true };
			},
			{ params: t.Object({ key: t.String() }) },
		);
}
