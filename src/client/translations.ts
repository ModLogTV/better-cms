import { getCached, setCached } from "./cache";
import { getClientConfig } from "./config";
import { cmsEvents } from "./events";

const TTL_MS = 60_000;

/** In-flight request dedup — prevents multiple concurrent calls for the same key from all hitting the network */
const inflight = new Map<string, Promise<Record<string, string>>>();

/**
 * Loads translations for a namespace+locale with 3-tier fallback:
 * 1. In-memory cache (TTL 60s)
 * 2. GET /cms/translations/:namespace/:locale
 * 3. `config.fallback({ namespace, locale })` if provided
 * 4. {} — t() returns the key string
 */
export async function loadTranslations(opts: {
	namespace: string;
	locale: string;
}): Promise<Record<string, string>> {
	const { namespace, locale } = opts;
	const cacheKey = `translations:${namespace}:${locale}`;

	const cached = getCached<Record<string, string>>({ key: cacheKey });
	if (cached) return cached;

	const existing = inflight.get(cacheKey);
	if (existing) return existing;

	const promise = (async () => {
		const config = getClientConfig();
		const ev = { type: "translations" as const, key: cacheKey };
		cmsEvents.emit("client:fetch:start", ev);
		config.onFetchStart?.(ev);

		try {
			const { cmsUrl, readToken } = config;
			const res = await fetch(
				`${cmsUrl}/cms/translations/${namespace}/${locale}`,
				{
					headers: { "x-internal-token": readToken },
				},
			);
			if (!res.ok) throw new Error(res.statusText);
			const data = (await res.json()) as Record<string, string>;
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

			const { fallback } = config;
			if (fallback) {
				const data = await fallback({ namespace, locale }).catch(() => null);
				if (data) {
					setCached({ key: cacheKey, value: data, ttlMs: TTL_MS });
					return data;
				}
			}
			return {};
		} finally {
			inflight.delete(cacheKey);
		}
	})();

	inflight.set(cacheKey, promise);
	return promise;
}
