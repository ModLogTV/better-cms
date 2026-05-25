import type { RawBlock } from "../core/adapter";
import { getCached, setCached } from "./cache";
import { getClientConfig } from "./config";
import { cmsEvents } from "./events";

const TTL_MS = 60_000;

const inflight = new Map<string, Promise<RawBlock[]>>();

/**
 * Loads page blocks for a slug+locale with fallback to empty array.
 * Uses the same 3-tier pattern as loadTranslations (cache → API → []).
 */
export async function loadPageContent(opts: {
	slug: string;
	locale: string;
}): Promise<RawBlock[]> {
	const { slug, locale } = opts;
	const cacheKey = `pages:${slug}:${locale}`;

	const cached = getCached<RawBlock[]>({ key: cacheKey });
	if (cached) return cached;

	const existing = inflight.get(cacheKey);
	if (existing) return existing;

	const promise = (async () => {
		const config = getClientConfig();
		const ev = { type: "pages" as const, key: cacheKey };
		cmsEvents.emit("client:fetch:start", ev);
		config.onFetchStart?.(ev);

		try {
			const { cmsUrl, readToken } = config;
			const encodedSlug = encodeURIComponent(slug);
			const res = await fetch(
				`${cmsUrl}/cms/pages/${encodedSlug}?locale=${locale}`,
				{
					headers: { "x-internal-token": readToken },
				},
			);
			if (!res.ok) throw new Error(res.statusText);
			const data = (await res.json()) as RawBlock[];
			setCached({ key: cacheKey, value: data, ttlMs: TTL_MS });

			const successEv = { ...ev, data };
			cmsEvents.emit("client:fetch:success", successEv);
			config.onFetchSuccess?.(successEv);

			return data;
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			const errorEv = { ...ev, error };
			cmsEvents.emit("client:fetch:error", errorEv);
			config.onFetchError?.(errorEv);
			return [];
		} finally {
			inflight.delete(cacheKey);
		}
	})();

	inflight.set(cacheKey, promise);
	return promise;
}
