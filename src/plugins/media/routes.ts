import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSContext } from "../../core/plugin";
import { requirePermission } from "../../elysia/auth";

export function mediaRoutes(ctx: CMSContext) {
	// No auth - this is the public counterpart to the admin-only routes below,
	// gated on publish state rather than a permission: draft/unpublished media
	// (or an unknown key) 404s here even though it's fully visible to admins
	// via GET /media.
	const publicRoutes = new Elysia().get(
		"/media/public/:key",
		async ({ params, set, redirect }) => {
			const asset = await ctx.adapter.getPublishedMediaAsset({
				key: params.key,
			});
			if (!asset) {
				set.status = 404;
				return { error: "Not found" };
			}
			return redirect(asset.publicUrl);
		},
		{ params: t.Object({ key: t.String() }) },
	);

	const adminRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.ADMIN_READ],
			}),
		)
		.get(
			"/media",
			async ({ query }) => {
				const tagIds = query.tagIds
					? query.tagIds.split(",").filter(Boolean)
					: undefined;
				return ctx.adapter.listMediaAssets({
					tagIds,
					tagOperator: query.tagOperator === "OR" ? "OR" : "AND",
				});
			},
			{
				query: t.Object({
					tagIds: t.Optional(t.String()),
					tagOperator: t.Optional(t.String()),
				}),
			},
		)
		.get("/media/tags", async () => {
			return ctx.adapter.listTags();
		})
		.get("/media/views", async () => {
			return ctx.adapter.listSavedViews();
		})
		.get(
			// `:id` here is a storage key (named to match the other single-resource
			// media routes at this same tree position - see router note below).
			"/media/:id/url",
			async ({ params, set }) => {
				if (!ctx.storage) {
					set.status = 503;
					return { error: "No storage adapter configured" };
				}
				const key = params.id;
				const assets = await ctx.adapter.listMediaAssets();
				const asset = assets.find((a) => a.key === key);
				if (!asset) {
					set.status = 404;
					return { error: "Asset not found" };
				}
				if (ctx.storage.presignRead) {
					const { url } = await ctx.storage.presignRead({ key });
					return { url };
				}
				return { url: asset.publicUrl };
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.get(
			"/media/:id/versions",
			async ({ params }) => {
				return ctx.adapter.listMediaVersions({ id: params.id });
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.get(
			"/media/versions/:versionId",
			async ({ params, set }) => {
				const version = await ctx.adapter.getMediaVersion({
					versionId: params.versionId,
				});
				if (!version) {
					set.status = 404;
					return null;
				}
				return version;
			},
			{ params: t.Object({ versionId: t.String() }) },
		)
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_UPLOAD],
			}),
		)
		.post(
			"/media/:id/publish",
			async ({ params, set }) => {
				try {
					await ctx.adapter.publishMediaAsset({ id: params.id });
					return { ok: true };
				} catch (err) {
					set.status = 409;
					return {
						error: err instanceof Error ? err.message : "Couldn't publish",
					};
				}
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.patch(
			"/media/:id",
			async ({ params, body }) => {
				return ctx.adapter.updateMediaAsset({ id: params.id, ...body });
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({
					metadata: t.Optional(t.Record(t.String(), t.Unknown())),
				}),
			},
		)
		.post(
			"/media/:id/restore",
			async ({ params, body, set }) => {
				try {
					return await ctx.adapter.restoreMediaVersion({
						id: params.id,
						versionId: body.versionId,
					});
				} catch (err) {
					set.status = 409;
					return {
						error:
							err instanceof Error ? err.message : "Couldn't restore version",
					};
				}
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({ versionId: t.String() }),
			},
		)
		.put(
			"/media/:id/tags",
			async ({ params, body }) => {
				await ctx.adapter.setAssetTags({
					assetId: params.id,
					tagIds: body.tagIds,
				});
				return { ok: true };
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({ tagIds: t.Array(t.String()) }),
			},
		)
		.post(
			"/media/tags",
			async ({ body }) => {
				return ctx.adapter.createTag({ id: crypto.randomUUID(), ...body });
			},
			{ body: t.Object({ name: t.String() }) },
		)
		.delete(
			"/media/tags/:id",
			async ({ params }) => {
				await ctx.adapter.deleteTag({ id: params.id });
				return { ok: true };
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.post(
			"/media/views",
			async ({ body, cmsUserId }) => {
				return ctx.adapter.createSavedView({
					id: crypto.randomUUID(),
					ownerId: cmsUserId,
					...body,
				});
			},
			{
				body: t.Object({
					name: t.String(),
					operator: t.Union([t.Literal("AND"), t.Literal("OR")]),
					tagIds: t.Array(t.String()),
				}),
			},
		)
		.delete(
			"/media/views/:id",
			async ({ params }) => {
				await ctx.adapter.deleteSavedView({ id: params.id });
				return { ok: true };
			},
			{ params: t.Object({ id: t.String() }) },
		);

	const uploadRoutes = new Elysia()
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
			"/media/:id/confirm",
			async ({ params, set }) => {
				await ctx.adapter.confirmMediaAsset({ id: params.id });
				set.status = 204;
			},
			{ params: t.Object({ id: t.String() }) },
		);

	const deleteRoutes = new Elysia()
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

	return new Elysia()
		.use(publicRoutes)
		.use(adminRoutes)
		.use(uploadRoutes)
		.use(deleteRoutes);
}
