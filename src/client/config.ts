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

// tsup builds each subpath entry (client/, next/, react/, next/client, ...)
// as an independent bundle (splitting: false), so this module's code is
// physically duplicated into every one of them - a plain module-level `let`
// would give each subpath its own private, independent copy, silently
// breaking the "call configureCMSClient() once" contract the moment an app
// uses more than one subpath (e.g. /react for hooks + /next for RSC, which
// is the documented Next.js quick-start setup). Keying off `globalThis`
// instead means every duplicate reads/writes the same actual value.
const CONFIG_KEY = Symbol.for("@modlog/better-cms/client-config");
interface GlobalWithCMSConfig {
	[CONFIG_KEY]?: CMSClientConfig | null;
}
const globalConfig = globalThis as GlobalWithCMSConfig;

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
	globalConfig[CONFIG_KEY] = config;
	if (config.cache === false) {
		setCacheEnabled(false);
	}
}

export function getClientConfig(): CMSClientConfig {
	const config = globalConfig[CONFIG_KEY];
	if (!config) {
		throw new Error(
			"better-cms: call configureCMSClient() before loading translations",
		);
	}
	return config;
}
