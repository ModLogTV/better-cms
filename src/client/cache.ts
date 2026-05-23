const cache = new Map<string, { value: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | undefined {
	const entry = cache.get(key);
	if (!entry) return undefined;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return undefined;
	}
	return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
	cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function deleteCached(key: string): void {
	cache.delete(key);
}
