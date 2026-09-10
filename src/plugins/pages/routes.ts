import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSContext } from "../../core/plugin";
import { requirePermission } from "../../elysia/auth";
import { parseSort } from "../../elysia/pagination";
import type { PageBlock } from "./types";

const CACHE_HEADER = "s-maxage=60, stale-while-revalidate=300";

export function pageRoutes(opts: { ctx: CMSContext; blocks: PageBlock[] }) {
	const { ctx, blocks } = opts;
	const blockSchemaMap = Object.fromEntries(
		blocks.map((b) => [b.type, b.schema]),
	);

	return new Elysia()
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
			}));
		})
		.get(
			"/pages/tree",
			async ({ query }) => {
				return ctx.adapter.listPageTree({ locale: query.locale });
			},
			{
				query: t.Object({ locale: t.Optional(t.String()) }),
			},
		)
		.get(
			"/pages/*",
			async ({ params, query, set }) => {
				const path = params["*"];
				const draft = query.draft === "true";
				const locale = query.locale ?? "en";
				const page = await ctx.adapter.getPage({
					slug: path,
					locale,
					draft,
				});
				if (!page) {
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
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.PAGES_WRITE],
			}),
		)
		.post(
			"/pages",
			async ({ body, set }) => {
				const id = crypto.randomUUID();
				try {
					return await ctx.adapter.createPage({
						id,
						slug: body.slug,
						locale: body.locale,
						parentId: body.parentId ?? null,
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
			async ({ params, body, set }) => {
				try {
					return await ctx.adapter.movePage({
						id: params.id,
						parentId: body.parentId,
					});
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
		.put(
			"/pages/:id",
			async ({ params, body }) => {
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
		.use(
			requirePermission({
				cms: ctx,
				permissions: [CMS_PERMISSIONS.PAGES_PUBLISH],
			}),
		)
		.post(
			"/pages/:id/publish",
			async ({ params }) => {
				await ctx.adapter.publishPage({ id: params.id });
				return { ok: true };
			},
			{ params: t.Object({ id: t.String() }) },
		);
}
