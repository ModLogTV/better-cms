export type FallbackLoader = (
	namespace: string,
	locale: string,
) => Promise<Record<string, string> | null>;

interface CMSClientConfig {
	cmsUrl: string;
	readToken: string;
	/** Optional fallback loader invoked when the CMS API is unreachable. */
	fallback?: FallbackLoader;
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
 *   fallback: async (ns, locale) => {
 *     try { return await import(`./locales/${locale}/${ns}.json`) } catch { return null }
 *   },
 * })
 * ```
 */
export function configureCMSClient(config: CMSClientConfig): void {
	_config = config;
}

export function getClientConfig(): CMSClientConfig {
	if (!_config) {
		throw new Error(
			"better-cms: call configureCMSClient() before loading translations",
		);
	}
	return _config;
}
