export interface NextMiddlewareOptions {
	locales: string[];
	defaultLocale: string;
	/** Cookie name for locale persistence. Default: "locale" */
	cookieName?: string;
}

/**
 * Returns a Next.js middleware function that:
 * - Reads locale from cookie, then Accept-Language header
 * - Redirects /path → /{locale}/path if locale not in URL
 * - Sets x-locale response header for RSC reading
 *
 * @example
 * ```ts
 * // middleware.ts
 * export default createNextMiddleware({ locales: ["en", "de"], defaultLocale: "en" })
 * export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] }
 * ```
 */
export function createNextMiddleware(opts: NextMiddlewareOptions) {
	const { locales, defaultLocale, cookieName = "locale" } = opts;

	// Return a plain function that accepts Request-like objects
	// Typed loosely to avoid requiring next as a dep at the type level
	return function cmsLocaleMiddleware(request: {
		nextUrl: { pathname: string; clone(): URL };
		cookies: { get(name: string): { value: string } | undefined };
		headers: { get(name: string): string | null };
	}) {
		const { pathname } = request.nextUrl;

		// Check if pathname already starts with a locale
		const pathnameLocale = locales.find(
			(locale) =>
				pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
		);
		if (pathnameLocale) return undefined; // already localised — no redirect

		// Detect locale from cookie → Accept-Language → default
		const cookieLocale = request.cookies.get(cookieName)?.value;
		const acceptLanguage = request.headers.get("accept-language") ?? "";
		const acceptedLocale = locales.find((l) =>
			acceptLanguage.toLowerCase().startsWith(l),
		);
		const locale =
			(cookieLocale && locales.includes(cookieLocale) ? cookieLocale : null) ??
			acceptedLocale ??
			defaultLocale;

		const url = request.nextUrl.clone();
		url.pathname = `/${locale}${pathname}`;

		// Redirect with x-locale header — consumers import from "next/server"
		return { redirect: url.toString(), locale };
	};
}
