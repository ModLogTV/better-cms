// See the comment in client/config.ts - this module is duplicated across every
// subpath bundle (splitting: false), so its state is keyed off `globalThis`
// rather than module-level `let`s, or the cache (and the enabled flag) would
// silently stop being shared the moment an app uses more than one subpath.
const CACHE_KEY = Symbol.for("@modlog/better-cms/client-cache");
const ENABLED_KEY = Symbol.for("@modlog/better-cms/client-cache-enabled");

interface GlobalWithCMSCache {
	[CACHE_KEY]?: Map<string, { value: unknown; expiresAt: number }>;
	[ENABLED_KEY]?: boolean;
}

const globalCache = globalThis as GlobalWithCMSCache;

function getCache(): Map<string, { value: unknown; expiresAt: number }> {
	let cache = globalCache[CACHE_KEY];
	if (!cache) {
		cache = new Map();
		globalCache[CACHE_KEY] = cache;
	}
	return cache;
}

function isEnabled(): boolean {
	return globalCache[ENABLED_KEY] ?? true;
}

export function setCacheEnabled(enabled: boolean): void {
	globalCache[ENABLED_KEY] = enabled;
}

export function getCached<T>({ key }: { key: string }): T | undefined {
	if (!isEnabled()) return undefined;
	const entry = getCache().get(key);
	if (!entry) return undefined;
	if (Date.now() > entry.expiresAt) {
		getCache().delete(key);
		return undefined;
	}
	return entry.value as T;
}

export function setCached<T>({
	key,
	value,
	ttlMs,
}: {
	key: string;
	value: T;
	ttlMs: number;
}): void {
	if (!isEnabled()) return;
	getCache().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function deleteCached({ key }: { key: string }): void {
	getCache().delete(key);
}
