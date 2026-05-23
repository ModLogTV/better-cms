import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface FallbackSyncOptions {
	cmsUrl: string;
	readToken: string;
	/** Directory to write fallback JSON files. Structure: `{outputDir}/{locale}/{namespace}.json` */
	outputDir: string;
	/**
	 * Polling interval in ms. Default: 3_600_000 (1h).
	 * Set to 0 to disable polling (one-shot sync only).
	 */
	interval?: number;
}

async function runSync(opts: FallbackSyncOptions): Promise<void> {
	const headers = { "x-internal-token": opts.readToken };
	const base = opts.cmsUrl.replace(/\/$/, "");

	const [namespacesRes, localesRes] = await Promise.all([
		fetch(`${base}/cms/admin/namespaces`, { headers }),
		fetch(`${base}/cms/admin/locales`, { headers }),
	]);

	if (!namespacesRes.ok || !localesRes.ok) {
		throw new Error(
			`better-cms: fallback sync failed — namespaces=${namespacesRes.status} locales=${localesRes.status}`,
		);
	}

	const namespaces = (await namespacesRes.json()) as Array<{ name: string }>;
	const locales = (await localesRes.json()) as Array<{ code: string }>;

	await Promise.all(
		namespaces.flatMap(({ name }) =>
			locales.map(async ({ code }) => {
				const res = await fetch(
					`${base}/cms/translations/${name}/${code}`,
					{ headers },
				);
				if (!res.ok) return;
				const data = (await res.json()) as Record<string, string>;
				const dir = join(opts.outputDir, code);
				await mkdir(dir, { recursive: true });
				await writeFile(
					join(dir, `${name}.json`),
					JSON.stringify(data, null, 2),
				);
			}),
		),
	);
}

/**
 * Syncs all CMS translations to local JSON files on startup, then polls on an interval.
 * Designed for use in Next.js `instrumentation.ts` `register()`.
 *
 * - Awaits the initial sync before resolving, so Next.js won't serve requests until fallback files exist.
 * - Starts a polling interval after the initial sync (default: 1h).
 *
 * @example
 * ```ts
 * // instrumentation.ts
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === "nodejs") {
 *     const { startFallbackSync } = await import("better-cms/plugins/fallback-sync")
 *     await startFallbackSync({
 *       cmsUrl: process.env.CMS_URL!,
 *       readToken: process.env.CMS_READ_TOKEN!,
 *       outputDir: "./locales",
 *     })
 *   }
 * }
 * ```
 */
export async function startFallbackSync(
	opts: FallbackSyncOptions,
): Promise<void> {
	await runSync(opts);

	const intervalMs = opts.interval ?? 3_600_000;
	if (intervalMs > 0) {
		setInterval(() => {
			runSync(opts).catch((err) => console.error("[better-cms] fallback sync error:", err));
		}, intervalMs);
	}
}
