const cache = new Map<string, { value: unknown; expiresAt: number }>();

let _enabled = true;

export function setCacheEnabled(enabled: boolean): void {
	_enabled = enabled;
}

export function getCached<T>(key: string): T | undefined {
	if (!_enabled) return undefined;
	const entry = cache.get(key);
	if (!entry) return undefined;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return undefined;
	}
	return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
	if (!_enabled) return;
	cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function deleteCached(key: string): void {
	cache.delete(key);
}
