import { setCacheEnabled } from "./cache";

export type FallbackLoader = (opts: {
	namespace: string;
	locale: string;
}) => Promise<Record<string, string> | null>;

interface CMSClientConfig {
	cmsUrl: string;
	readToken: string;
	/** Optional fallback loader invoked when the CMS API is unreachable. */
	fallback?: FallbackLoader;
	/** Set to false to disable in-memory translation cache. Defaults to true. */
	cache?: boolean;

	// Global lifecycle callbacks
	onFetchStart?: (ev: { type: "translations" | "pages"; key: string }) => void;
	onFetchSuccess?: (ev: {
		type: "translations" | "pages";
		key: string;
		data: unknown;
	}) => void;
	onFetchError?: (ev: {
		type: "translations" | "pages";
		key: string;
		error: Error;
	}) => void;
}

let _config: CMSClientConfig | null = null;

/**
 * Call once at app startup before any loadTranslations() / loadPageContent() calls.
 * @example
 * ```ts
 * configureCMSClient({
 *   cmsUrl: process.env.CMS_URL,
 *   readToken: process.env.CMS_READ_TOKEN,
 *   // optional: your bundler resolves these
 *   fallback: async ({ namespace, locale }) => {
 *     try { return await import(`./locales/${locale}/${namespace}.json`) } catch { return null }
 *   },
 * })
 * ```
 */
export function configureCMSClient(config: CMSClientConfig): void {
	_config = config;
	if (config.cache === false) {
		setCacheEnabled(false);
	}
}

export function getClientConfig(): CMSClientConfig {
	if (!_config) {
		throw new Error(
			"better-cms: call configureCMSClient() before loading translations",
		);
	}
	return _config;
}
