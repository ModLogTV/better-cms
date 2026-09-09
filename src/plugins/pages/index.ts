import type { CMSInfer, CMSPlugin } from "../../core/plugin";
import { pageRoutes } from "./routes";
import type { BlockUnion, PageBlock } from "./types";

/**
 * Adds page block routes (GET/PUT/publish) to the Elysia plugin.
 * Also extends `cms.$Infer.PageBlocks` with a typed block union.
 *
 * @example
 * ```ts
 * const heroBlock: PageBlock = { type: "hero", schema: z.object({ title: z.string() }) }
 * pagesPlugin({ blocks: [heroBlock] })
 * ```
 */
export function pagesPlugin(opts?: { blocks?: PageBlock[] }): CMSPlugin {
	const blocks = opts?.blocks ?? [];
	return {
		name: "pages",
		init(ctx) {
			ctx.elysiaApp.use(pageRoutes({ ctx, blocks }));
		},
		extendInfer(current: CMSInfer): CMSInfer {
			return {
				...current,
				PageBlocks: undefined as unknown as BlockUnion<typeof blocks>,
			};
		},
	};
}

export type {
	BlockDefinition,
	BlockFieldDefinition,
	BlockFieldType,
	BlockUnion,
	PageBlock,
} from "./types";
