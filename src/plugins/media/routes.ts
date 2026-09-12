import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS, hasPermission } from "../../auth/permissions";
import type { CMSAdapter, MediaTagAction } from "../../core/adapter";
import type { CMSContext } from "../../core/plugin";
import { requirePermission } from "../../elysia/auth";

/**
 * True if `globalPerms` already grants `globalPermission`, or the subject
 * has a matching tag grant for `action` on any one of the asset's tags (OR,
 * not AND). Untagged assets are purely global-gated - there's nothing for a
 * tag grant to match against. Node-scoped grants are purely additive on top
 * of the global permission set, same pattern as page ACL.
 */
async function canAccessMedia(opts: {
	adapter: CMSAdapter;
	globalPerms: string[];
	userId: string | undefined;
	groupIds: string[];
	tagIds: string[];
	action: MediaTagAction;
	globalPermission: (typeof CMS_PERMISSIONS)[keyof typeof CMS_PERMISSIONS];
}): Promise<boolean> {
	if (
		hasPermission({
			userPerms: opts.globalPerms,
			required: opts.globalPermission,
		})
	) {
		return true;
	}
	if (opts.tagIds.length === 0) return false;
	const effective = await opts.adapter.getEffectiveMediaTagPermissions({
		userId: opts.userId,
		groupIds: opts.groupIds,
		tagIds: opts.tagIds,
	});
	return effective.includes(opts.action);
}

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

	// MEDIA_VIEW is a hard baseline for the whole media library, for every
	// user - there's no way to open it via a tag grant alone. A subject who
	// also holds ADMIN_READ (or the wildcard) sees every asset regardless of
	// tags, same as today; everyone else sees untagged assets plus tagged
	// ones they hold a "view" grant on (via any one of the asset's tags).
	const viewRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_VIEW],
			}),
		)
		.get(
			"/media",
			async ({ query, cmsUserId, cmsPermissions = [], cmsGroupIds = [] }) => {
				const tagIds = query.tagIds
					? query.tagIds.split(",").filter(Boolean)
					: undefined;
				const seesEverything = hasPermission({
					userPerms: cmsPermissions,
					required: CMS_PERMISSIONS.ADMIN_READ,
				});
				return ctx.adapter.listMediaAssets({
					tagIds,
					tagOperator: query.tagOperator === "OR" ? "OR" : "AND",
					subject: seesEverything
						? undefined
						: { userId: cmsUserId, groupIds: cmsGroupIds },
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
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
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
				const canView = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: asset.tagIds,
					action: "view",
					globalPermission: CMS_PERMISSIONS.ADMIN_READ,
				});
				if (!canView) {
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
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getMediaAssetById({ id: params.id });
				if (!target) {
					set.status = 404;
					return [];
				}
				const canView = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "view",
					globalPermission: CMS_PERMISSIONS.ADMIN_READ,
				});
				if (!canView) {
					set.status = 404;
					return [];
				}
				return ctx.adapter.listMediaVersions({ id: params.id });
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.get(
			"/media/versions/:versionId",
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const version = await ctx.adapter.getMediaVersion({
					versionId: params.versionId,
				});
				if (!version) {
					set.status = 404;
					return null;
				}
				const target = await ctx.adapter.getMediaAssetById({
					id: version.assetId,
				});
				if (!target) {
					set.status = 404;
					return null;
				}
				const canView = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "view",
					globalPermission: CMS_PERMISSIONS.ADMIN_READ,
				});
				if (!canView) {
					set.status = 404;
					return null;
				}
				return version;
			},
			{ params: t.Object({ versionId: t.String() }) },
		);

	// Edits to an EXISTING asset (publish/metadata/restore/tag-assignment)
	// accept a node-scoped... er, tag-scoped grant as an alternative to the
	// global MEDIA_UPLOAD permission. Creating a brand new asset (presign)
	// never does - it has no tags yet for a grant to match against, so it
	// stays gated by the group-level MEDIA_UPLOAD requirement below.
	const editRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_VIEW],
			}),
		)
		.post(
			"/media/:id/publish",
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getMediaAssetById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { ok: false, error: "Asset not found" };
				}
				const canPublish = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "publish",
					globalPermission: CMS_PERMISSIONS.MEDIA_UPLOAD,
				});
				if (!canPublish) {
					set.status = 403;
					return { ok: false, error: "Forbidden" };
				}
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
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getMediaAssetById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { error: "Asset not found" };
				}
				const canEdit = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "edit",
					globalPermission: CMS_PERMISSIONS.MEDIA_UPLOAD,
				});
				if (!canEdit) {
					set.status = 403;
					return { error: "Forbidden" };
				}
				return ctx.adapter.updateMediaAsset({ id: params.id, ...body });
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({
					metadata: t.Optional(t.Record(t.String(), t.Unknown())),
					key: t.Optional(t.String()),
					filename: t.Optional(t.String()),
					mimeType: t.Optional(t.String()),
					size: t.Optional(t.Number()),
					publicUrl: t.Optional(t.String()),
				}),
			},
		)
		.post(
			// Presigns a fresh storage key for an existing asset (re-upload /
			// replace-file) - unlike POST /media/presign, this never creates a
			// new MediaAsset; the caller lands the new version via PATCH
			// /media/:id once the upload completes.
			"/media/:id/presign",
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				if (!ctx.storage) {
					set.status = 503;
					return { error: "No storage adapter configured" };
				}
				const target = await ctx.adapter.getMediaAssetById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { error: "Asset not found" };
				}
				const canEdit = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "edit",
					globalPermission: CMS_PERMISSIONS.MEDIA_UPLOAD,
				});
				if (!canEdit) {
					set.status = 403;
					return { error: "Forbidden" };
				}
				const key = `${Date.now()}-${body.filename}`;
				const { uploadUrl, publicUrl } = await ctx.storage.presign({
					key,
					mimeType: body.mimeType,
					size: body.size,
				});
				return { uploadUrl, publicUrl, key };
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({
					filename: t.String(),
					mimeType: t.String(),
					size: t.Number(),
				}),
			},
		)
		.post(
			"/media/:id/restore",
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getMediaAssetById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { error: "Asset not found" };
				}
				const canEdit = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "edit",
					globalPermission: CMS_PERMISSIONS.MEDIA_UPLOAD,
				});
				if (!canEdit) {
					set.status = 403;
					return { error: "Forbidden" };
				}
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
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getMediaAssetById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { error: "Asset not found" };
				}
				const canEdit = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: target.tagIds,
					action: "edit",
					globalPermission: CMS_PERMISSIONS.MEDIA_UPLOAD,
				});
				if (!canEdit) {
					set.status = 403;
					return { error: "Forbidden" };
				}
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
		.delete(
			"/media/:key",
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
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
				const canDelete = await canAccessMedia({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					tagIds: asset.tagIds,
					action: "delete",
					globalPermission: CMS_PERMISSIONS.MEDIA_DELETE,
				});
				if (!canDelete) {
					set.status = 403;
					return { error: "Forbidden" };
				}
				await Promise.all([
					ctx.storage.delete({ key: params.key }),
					ctx.adapter.deleteMediaAsset({ key: params.key }),
				]);
				return { ok: true };
			},
			{ params: t.Object({ key: t.String() }) },
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
			async ({ params, body, set }) => {
				await ctx.adapter.confirmMediaAsset({
					id: params.id,
					metadata: body?.metadata,
				});
				set.status = 204;
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Optional(
					t.Object({
						metadata: t.Optional(t.Record(t.String(), t.Unknown())),
					}),
				),
			},
		);

	// Tag CRUD and grant management require MEDIA_TAG_MANAGE specifically -
	// not a tag grant, and not even the global MEDIA_UPLOAD used for
	// assigning existing tags to media. Letting a tag-scoped grantee manage
	// grants (or rename/delete the tag they're scoped to) would let them
	// escalate their own access, same reasoning as page ACL management.
	const tagManageRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_TAG_MANAGE],
			}),
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
		.get(
			"/media/tags/:id/grants",
			async ({ params }) => {
				return ctx.adapter.listMediaTagGrants({ tagId: params.id });
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.post(
			"/media/tags/:id/grants",
			async ({ params, body }) => {
				return ctx.adapter.addMediaTagGrant({
					id: crypto.randomUUID(),
					tagId: params.id,
					subjectType: body.subjectType,
					subjectId: body.subjectId,
					permission: body.permission,
				});
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({
					subjectType: t.Union([t.Literal("user"), t.Literal("group")]),
					subjectId: t.String(),
					permission: t.Union([
						t.Literal("view"),
						t.Literal("upload"),
						t.Literal("edit"),
						t.Literal("delete"),
						t.Literal("publish"),
					]),
				}),
			},
		)
		.delete(
			"/media/tag-grants/:id",
			async ({ params }) => {
				await ctx.adapter.removeMediaTagGrant({ id: params.id });
				return { ok: true };
			},
			{ params: t.Object({ id: t.String() }) },
		);

	const viewManageRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.MEDIA_VIEW],
			}),
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

	return new Elysia()
		.use(publicRoutes)
		.use(viewRoutes)
		.use(editRoutes)
		.use(uploadRoutes)
		.use(tagManageRoutes)
		.use(viewManageRoutes);
}
