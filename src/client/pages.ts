import type { RawBlock } from "../core/adapter";
import { getCached, setCached } from "./cache";
import { getClientConfig } from "./config";

const TTL_MS = 60_000;

const inflight = new Map<string, Promise<RawBlock[]>>();

/**
 * Loads page blocks for a slug+locale with fallback to empty array.
 * Uses the same 3-tier pattern as loadTranslations (cache → API → []).
 */
export async function loadPageContent(
	slug: string,
	locale: string,
): Promise<RawBlock[]> {
	const cacheKey = `pages:${slug}:${locale}`;

	const cached = getCached<RawBlock[]>(cacheKey);
	if (cached) return cached;

	const existing = inflight.get(cacheKey);
	if (existing) return existing;

	const promise = (async () => {
		try {
			const { cmsUrl, readToken } = getClientConfig();
			const encodedSlug = encodeURIComponent(slug);
			const res = await fetch(
				`${cmsUrl}/cms/pages/${encodedSlug}?locale=${locale}`,
				{
					headers: { "x-internal-token": readToken },
				},
			);
			if (!res.ok) throw new Error(res.statusText);
			const data = (await res.json()) as RawBlock[];
			setCached(cacheKey, data, TTL_MS);
			return data;
		} catch {
			return [];
		} finally {
			inflight.delete(cacheKey);
		}
	})();

	inflight.set(cacheKey, promise);
	return promise;
}
