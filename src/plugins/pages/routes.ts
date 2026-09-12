import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS, hasPermission } from "../../auth/permissions";
import type { CMSAdapter } from "../../core/adapter";
import type { CMSContext } from "../../core/plugin";
import { requireAuth, requirePermission } from "../../elysia/auth";
import { parseSort } from "../../elysia/pagination";
import type { PageBlock } from "./types";

const CACHE_HEADER = "s-maxage=60, stale-while-revalidate=300";

/**
 * True if `globalPerms` already grants `permission`, or the subject has an
 * ACL grant for it on `nodeId` (own node or inherited from an ancestor).
 * Node-scoped grants are purely additive on top of the global permission set.
 */
async function canAccessNode(opts: {
	adapter: CMSAdapter;
	globalPerms: string[];
	userId: string | undefined;
	groupIds: string[];
	nodeId: string;
	permission: (typeof CMS_PERMISSIONS)[keyof typeof CMS_PERMISSIONS];
	locale?: string;
}): Promise<boolean> {
	if (
		hasPermission({ userPerms: opts.globalPerms, required: opts.permission })
	) {
		return true;
	}
	const effective = await opts.adapter.getEffectivePagePermissions({
		userId: opts.userId,
		groupIds: opts.groupIds,
		nodeId: opts.nodeId,
		locale: opts.locale,
	});
	return effective.includes(opts.permission);
}

export function pageRoutes(opts: { ctx: CMSContext; blocks: PageBlock[] }) {
	const { ctx, blocks } = opts;
	const blockSchemaMap = Object.fromEntries(
		blocks.map((b) => [b.type, b.schema]),
	);

	// Each group below is its own Elysia sub-instance so its auth hook stays
	// scoped to that instance's own routes instead of leaking forward onto
	// the next group once they're merged at the bottom.
	const listRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.PAGES_READ],
			}),
		)
		.get(
			"/pages",
			async ({ query }) => {
				return ctx.adapter.listPages({
					page: query.page ? Number(query.page) : 1,
					pageSize: query.pageSize ? Number(query.pageSize) : 20,
					sort: parseSort(query.sort),
					status: query.status as "draft" | "published" | undefined,
					locale: query.locale,
				});
			},
			{
				query: t.Object({
					page: t.Optional(t.String()),
					pageSize: t.Optional(t.String()),
					sort: t.Optional(t.String()),
					status: t.Optional(t.String()),
					locale: t.Optional(t.String()),
				}),
			},
		)
		.get("/pages/blocks", () => {
			return blocks.map((b) => ({
				type: b.type,
				label: b.label ?? b.type,
				fields: b.fields ?? [],
				preview: b.preview,
			}));
		});

	// Authentication only, not a blanket PAGES_READ/WRITE/PUBLISH requirement -
	// each handler here also accepts a node-scoped ACL grant (ticket #3), so
	// it can't be gated by a single group-level permission.
	const aclAwareRoutes = new Elysia()
		.use(requireAuth({ cms: ctx }))
		.get(
			"/pages/tree",
			async ({ cmsUserId, cmsPermissions = [], cmsGroupIds = [] }) => {
				if (
					hasPermission({
						userPerms: cmsPermissions,
						required: CMS_PERMISSIONS.PAGES_READ,
					})
				) {
					return ctx.adapter.listPageTree();
				}
				return ctx.adapter.listPageTree({
					subject: { userId: cmsUserId, groupIds: cmsGroupIds },
				});
			},
		)
		.get(
			"/pages/*",
			async ({
				params,
				query,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const path = params["*"];
				const draft = query.draft === "true";
				const locale = query.locale ?? "en";
				const page = await ctx.adapter.getPage({ slug: path, locale, draft });
				if (!page) {
					set.status = 404;
					return null;
				}
				const canRead = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: page.nodeId,
					permission: CMS_PERMISSIONS.PAGES_READ,
					locale,
				});
				if (!canRead) {
					set.status = 404;
					return null;
				}
				set.headers["Cache-Control"] = CACHE_HEADER;
				return page.blocks;
			},
			{
				query: t.Object({
					locale: t.Optional(t.String()),
					draft: t.Optional(t.String()),
				}),
			},
		)
		.post(
			"/pages",
			async ({
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const parentId = body.parentId ?? null;
				const canCreate = parentId
					? await canAccessNode({
							adapter: ctx.adapter,
							globalPerms: cmsPermissions,
							userId: cmsUserId,
							groupIds: cmsGroupIds,
							nodeId: parentId,
							permission: CMS_PERMISSIONS.PAGES_WRITE,
						})
					: hasPermission({
							userPerms: cmsPermissions,
							required: CMS_PERMISSIONS.PAGES_WRITE,
						});
				if (!canCreate) {
					set.status = 403;
					return { error: "Forbidden", required: CMS_PERMISSIONS.PAGES_WRITE };
				}
				const id = crypto.randomUUID();
				try {
					return await ctx.adapter.createPage({
						id,
						slug: body.slug,
						locale: body.locale,
						parentId,
					});
				} catch {
					set.status = 409;
					return {
						error: `A page already exists for slug "${body.slug}" and locale "${body.locale}" under that parent.`,
					};
				}
			},
			{
				body: t.Object({
					slug: t.String(),
					locale: t.String(),
					parentId: t.Optional(t.Union([t.String(), t.Null()])),
				}),
			},
		)
		.post(
			"/pages/:id/move",
			// `:id` is a node id here - move is a tree-node operation, not a per-locale one.
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const canMove = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: params.id,
					permission: CMS_PERMISSIONS.PAGES_WRITE,
				});
				const canReparent =
					body.parentId === null ||
					(await canAccessNode({
						adapter: ctx.adapter,
						globalPerms: cmsPermissions,
						userId: cmsUserId,
						groupIds: cmsGroupIds,
						nodeId: body.parentId,
						permission: CMS_PERMISSIONS.PAGES_WRITE,
					}));
				if (!canMove || !canReparent) {
					set.status = 403;
					return { error: "Forbidden", required: CMS_PERMISSIONS.PAGES_WRITE };
				}
				try {
					await ctx.adapter.movePage({
						nodeId: params.id,
						parentId: body.parentId,
					});
					return { ok: true };
				} catch (err) {
					set.status = 409;
					return {
						error: err instanceof Error ? err.message : "Couldn't move page",
					};
				}
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({ parentId: t.Union([t.String(), t.Null()]) }),
			},
		)
		.post(
			"/pages/:id/locales",
			// `:id` is a node id here.
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const canWrite = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: params.id,
					permission: CMS_PERMISSIONS.PAGES_WRITE,
				});
				if (!canWrite) {
					set.status = 403;
					return { error: "Forbidden", required: CMS_PERMISSIONS.PAGES_WRITE };
				}
				const contentId = crypto.randomUUID();
				try {
					return await ctx.adapter.addPageLocale({
						id: contentId,
						nodeId: params.id,
						locale: body.locale,
						cloneFromLocale: body.cloneFromLocale,
					});
				} catch {
					set.status = 409;
					return {
						error: `That page already has content for locale "${body.locale}".`,
					};
				}
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({
					locale: t.String(),
					cloneFromLocale: t.Optional(t.String()),
				}),
			},
		)
		.put(
			"/pages/:id",
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getPageById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { ok: false, error: "Page not found" };
				}
				const canWrite = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: target.nodeId,
					permission: CMS_PERMISSIONS.PAGES_WRITE,
					locale: target.locale,
				});
				if (!canWrite) {
					set.status = 403;
					return { ok: false, error: "Forbidden" };
				}
				const rawBlocks = body as { type: string; data: unknown }[];
				for (const block of rawBlocks) {
					const schema = blockSchemaMap[block.type];
					if (!schema)
						return { ok: false, error: `Unknown block type: ${block.type}` };
					const result = schema.safeParse(block.data);
					if (!result.success) {
						return { ok: false, error: result.error.message };
					}
				}
				await ctx.adapter.upsertPage({ id: params.id, blocks: rawBlocks });
				return { ok: true };
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Array(t.Object({ type: t.String(), data: t.Unknown() })),
			},
		)
		.post(
			"/pages/:id/publish",
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getPageById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { ok: false, error: "Page not found" };
				}
				const canPublish = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: target.nodeId,
					permission: CMS_PERMISSIONS.PAGES_PUBLISH,
					locale: target.locale,
				});
				if (!canPublish) {
					set.status = 403;
					return { ok: false, error: "Forbidden" };
				}
				await ctx.adapter.publishPage({ id: params.id });
				return { ok: true };
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.get(
			"/pages/:id/versions",
			// `:id` is a content id.
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getPageById({ id: params.id });
				if (!target) {
					set.status = 404;
					return [];
				}
				const canRead = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: target.nodeId,
					permission: CMS_PERMISSIONS.PAGES_READ,
					locale: target.locale,
				});
				if (!canRead) {
					set.status = 404;
					return [];
				}
				return ctx.adapter.listPageVersions({ id: params.id });
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.get(
			"/pages/versions/:versionId",
			async ({
				params,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const version = await ctx.adapter.getPageVersion({
					versionId: params.versionId,
				});
				if (!version) {
					set.status = 404;
					return null;
				}
				const target = await ctx.adapter.getPageById({ id: version.contentId });
				if (!target) {
					set.status = 404;
					return null;
				}
				const canRead = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: target.nodeId,
					permission: CMS_PERMISSIONS.PAGES_READ,
					locale: target.locale,
				});
				if (!canRead) {
					set.status = 404;
					return null;
				}
				return version;
			},
			{ params: t.Object({ versionId: t.String() }) },
		)
		.post(
			"/pages/:id/restore",
			// `:id` is a content id.
			async ({
				params,
				body,
				set,
				cmsUserId,
				cmsPermissions = [],
				cmsGroupIds = [],
			}) => {
				const target = await ctx.adapter.getPageById({ id: params.id });
				if (!target) {
					set.status = 404;
					return { ok: false, error: "Page not found" };
				}
				const canWrite = await canAccessNode({
					adapter: ctx.adapter,
					globalPerms: cmsPermissions,
					userId: cmsUserId,
					groupIds: cmsGroupIds,
					nodeId: target.nodeId,
					permission: CMS_PERMISSIONS.PAGES_WRITE,
					locale: target.locale,
				});
				if (!canWrite) {
					set.status = 403;
					return { ok: false, error: "Forbidden" };
				}
				try {
					return await ctx.adapter.restorePageVersion({
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
		);

	// Managing ACL grants requires the GLOBAL write permission specifically
	// (not a node-scoped grant) - letting an ACL-only write holder manage
	// grants on their own node would let them escalate their own access.
	const grantRoutes = new Elysia()
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.PAGES_WRITE],
			}),
		)
		.get(
			"/pages/:id/grants",
			// `:id` is a node id.
			async ({ params }) => {
				return ctx.adapter.listPageGrants({ nodeId: params.id });
			},
			{ params: t.Object({ id: t.String() }) },
		)
		.get(
			// Mirror image of the per-node listing above - every grant one
			// subject holds, across every page. Powers a group's own "Page
			// access" view (rather than only a page's "who has access" view).
			"/pages/grants/by-subject",
			async ({ query }) => {
				return ctx.adapter.listPageGrantsForSubject({
					subjectType: query.subjectType,
					subjectId: query.subjectId,
				});
			},
			{
				query: t.Object({
					subjectType: t.Union([t.Literal("user"), t.Literal("group")]),
					subjectId: t.String(),
				}),
			},
		)
		.post(
			"/pages/:id/grants",
			async ({ params, body, cmsUserId }) => {
				const grant = await ctx.adapter.addPageGrant({
					id: crypto.randomUUID(),
					nodeId: params.id,
					subjectType: body.subjectType,
					subjectId: body.subjectId,
					permission: body.permission,
					locale: body.locale ?? null,
				});
				await ctx.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "pageGrant.added",
					targetType: "pageGrant",
					targetId: grant.id,
					detail: {
						nodeId: grant.nodeId,
						subjectType: grant.subjectType,
						subjectId: grant.subjectId,
						permission: grant.permission,
						locale: grant.locale,
					},
				});
				return grant;
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Object({
					subjectType: t.Union([t.Literal("user"), t.Literal("group")]),
					subjectId: t.String(),
					permission: t.String(),
					locale: t.Optional(t.Union([t.String(), t.Null()])),
				}),
			},
		)
		.delete(
			"/pages/grants/:grantId",
			async ({ params, cmsUserId }) => {
				const before = await ctx.adapter.getPageGrant({ id: params.grantId });
				await ctx.adapter.removePageGrant({ id: params.grantId });
				await ctx.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "pageGrant.removed",
					targetType: "pageGrant",
					targetId: params.grantId,
					detail: before
						? {
								nodeId: before.nodeId,
								subjectType: before.subjectType,
								subjectId: before.subjectId,
								permission: before.permission,
								locale: before.locale,
							}
						: {},
				});
				return { ok: true };
			},
			{ params: t.Object({ grantId: t.String() }) },
		);

	return new Elysia().use(listRoutes).use(aclAwareRoutes).use(grantRoutes);
}
