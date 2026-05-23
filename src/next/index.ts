export type { NextMiddlewareOptions } from "./middleware";
export { createNextMiddleware } from "./middleware";

/**
 * Reads the active locale in a Next.js Server Component, Server Action, or Route Handler.
 * Falls back to `defaultLocale` when the cookie is absent.
 *
 * @example
 * ```ts
 * // app/layout.tsx (Server Component)
 * import { getLocale } from "better-cms/next"
 *
 * export default async function RootLayout({ children }) {
 *   const locale = await getLocale()
 *   return <Providers locale={locale}>{children}</Providers>
 * }
 * ```
 */
export async function getLocale(opts?: {
	cookieName?: string;
	defaultLocale?: string;
}): Promise<string> {
	const { cookieName = "locale", defaultLocale = "en" } = opts ?? {};
	// Dynamic import keeps "next/headers" out of non-Next.js bundles.
	// Cast to avoid requiring @types/next in this package.
	type CookieStore = { get(name: string): { value: string } | undefined };
	type NextHeaders = { cookies(): Promise<CookieStore> };
	const { cookies } = (await import(
		"next/headers" as string
	)) as unknown as NextHeaders;
	const jar = await cookies();
	return jar.get(cookieName)?.value ?? defaultLocale;
}

/**
 * Wraps the CMS Elysia app as Next.js App Router route handlers.
 *
 * @example
 * ```ts
 * // app/api/cms/[...slug]/route.ts
 * import { toNextHandler } from "better-cms/next"
 * import { cms } from "@/lib/cms"
 * import { toElysiaPlugin } from "better-cms/elysia"
 *
 * const handler = toElysiaPlugin(cms).handle
 * export const GET = handler
 * export const PUT = handler
 * export const POST = handler
 * ```
 */
export function toNextHandler(handle: (req: Request) => Promise<Response>) {
	return { GET: handle, PUT: handle, POST: handle };
}
