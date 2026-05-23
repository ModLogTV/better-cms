import { Elysia } from "elysia";
import type { CMSInstance } from "../core/index";
import { adminRoutes } from "./routes/admin";
import { translationRoutes } from "./routes/translations";

/**
 * Mounts all CMS routes onto an Elysia app.
 * Translation routes are included by default.
 * Page and media routes are added by pagesPlugin / mediaPlugin via plugin.init().
 *
 * @example
 * ```ts
 * const app = new Elysia().use(toElysiaPlugin(cms))
 * ```
 */
export function toElysiaPlugin(cms: CMSInstance) {
	return new Elysia({ prefix: "/cms" })
		.use(translationRoutes(cms))
		.use(adminRoutes(cms))
		.use(cms.elysiaApp);
}
