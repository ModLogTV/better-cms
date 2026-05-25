import type { Locale } from "../core/adapter";
import { getCached, setCached } from "./cache";
import { getClientConfig } from "./config";

const TTL_MS = 300_000; // Locales change rarely, 5 min cache is fine

const cacheKey = "client:locales";
let inflight: Promise<Locale[]> | null = null;

/**
 * Fetches all active locales from the CMS API.
 * Uses a 5-minute in-memory cache and deduplicates concurrent requests.
 */
export async function loadLocales(): Promise<Locale[]> {
	const cached = getCached<Locale[]>(cacheKey);
	if (cached) return cached;

	if (inflight) return inflight;

	inflight = (async () => {
		try {
			const { cmsUrl, readToken } = getClientConfig();
			const res = await fetch(`${cmsUrl}/cms/admin/locales`, {
				headers: { "x-internal-token": readToken },
			});
			if (!res.ok) throw new Error(res.statusText);
			const data = (await res.json()) as Locale[];
			setCached(cacheKey, data, TTL_MS);
			return data;
		} catch (err) {
			console.error("[cms] Failed to load locales:", err);
			return [];
		} finally {
			inflight = null;
		}
	})();

	return inflight;
}
