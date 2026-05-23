export type { NextMiddlewareOptions } from "./middleware";
export { createNextMiddleware } from "./middleware";

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
