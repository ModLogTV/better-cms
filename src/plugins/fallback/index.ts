import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CMSPlugin } from "../../core/plugin";

/**
 * Writes a fallback JSON file to disk on every successful translation PUT.
 * Files land at `{outputDir}/{locale}/{namespace}.json`.
 * The client loader imports these when the CMS API is unreachable.
 */
export function fallbackPlugin(opts: { outputDir: string }): CMSPlugin {
	return {
		name: "fallback",
		init(ctx) {
			ctx.events.on(
				"translations:updated",
				async ({ namespace, locale, values }) => {
					const dir = join(opts.outputDir, locale);
					await mkdir(dir, { recursive: true });
					await writeFile(
						join(dir, `${namespace}.json`),
						JSON.stringify(values, null, 2),
					);
				},
			);
		},
	};
}
