import { Elysia, t } from "elysia";
import type { CMSContext } from "../../core/plugin";
import { requireFullToken, requireReadToken } from "../../elysia/auth";
import type { PageBlock } from "./types";

const CACHE_HEADER = "s-maxage=60, stale-while-revalidate=300";

export function pageRoutes(ctx: CMSContext, blocks: PageBlock[]) {
	const blockSchemaMap = Object.fromEntries(
		blocks.map((b) => [b.type, b.schema]),
	);

	return new Elysia()
		.use(requireReadToken(ctx))
		.get("/pages", async () => {
			return ctx.adapter.listPages();
		})
		.get(
			"/pages/:slug",
			async ({ params, query, set }) => {
				const draft = query.draft === "true";
				const locale = query.locale ?? "en";
				const page = await ctx.adapter.getPage(params.slug, locale, draft);
				if (!page) return set.status === 200 ? (set.status = 404) : null;
				set.headers["Cache-Control"] = CACHE_HEADER;
				return page.blocks;
			},
			{
				params: t.Object({ slug: t.String() }),
				query: t.Object({
					locale: t.Optional(t.String()),
					draft: t.Optional(t.String()),
				}),
			},
		)
		.use(requireFullToken(ctx))
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
				await ctx.adapter.upsertPage(params.id, rawBlocks);
				return { ok: true };
			},
			{
				params: t.Object({ id: t.String() }),
				body: t.Array(t.Object({ type: t.String(), data: t.Unknown() })),
			},
		)
		.post(
			"/pages/:id/publish",
			async ({ params }) => {
				await ctx.adapter.publishPage(params.id);
				return { ok: true };
			},
			{ params: t.Object({ id: t.String() }) },
		);
}
