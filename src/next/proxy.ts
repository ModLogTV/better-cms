export interface NextProxyOptions {
	locales: string[];
	defaultLocale: string;
	cookieName?: string;
}

/**
 * Returns a Next.js proxy function (formerly middleware) that:
 * 1. Checks if the URL already has a locale prefix (e.g. /en/about)
 * 2. If not, detects locale from: Cookie -> Accept-Language -> defaultLocale
 * 3. Returns a redirect object or undefined.
 *
 * @example
 * ```ts
 * // proxy.ts
 * export default createNextProxy({ locales: ["en", "de"], defaultLocale: "en" })
 * ```
 */
export function createNextProxy(opts: NextProxyOptions) {
	const { locales, defaultLocale, cookieName = "locale" } = opts;

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: regex + logic
	return function cmsLocaleProxy(request: {
		nextUrl: { pathname: string; href: string };
		headers: { get(name: string): string | null };
		cookies: { get(name: string): { value: string } | undefined };
	}) {
		const { pathname } = request.nextUrl;

		// 1. Skip if URL already starts with a supported locale
		const hasLocale = locales.some(
			(locale) =>
				pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
		);
		if (hasLocale) return;

		// 2. Detect locale
		// a. Cookie
		let locale = request.cookies.get(cookieName)?.value;

		// b. Accept-Language header
		if (!locale) {
			const accept = request.headers.get("accept-language");
			if (accept) {
				const preferred = accept.split(",")[0].split("-")[0];
				if (locales.includes(preferred)) {
					locale = preferred;
				}
			}
		}

		// c. Default
		if (!locale || !locales.includes(locale)) {
			locale = defaultLocale;
		}

		// 3. Construct redirect URL
		const url = new URL(request.nextUrl.href);
		url.pathname = `/${locale}${pathname}`;

		return {
			redirect: url,
			locale,
		};
	};
}
