import { Elysia } from "elysia";
import type { CMSInstance } from "../core/index";
import { adminRoutes } from "./routes/admin";
import { translationRoutes } from "./routes/translations";
import { userRoutes } from "./routes/users";

/**
 * Mounts all CMS routes onto an Elysia app.
 * Translation routes are included by default.
 * Page and media routes are added by pagesPlugin / mediaPlugin via plugin.init().
 * User/group management routes are added when `auth.management` is defined.
 *
 * @example
 * ```ts
 * const app = new Elysia().use(toElysiaPlugin(cms))
 * ```
 */
export { adminPanelPlugin } from "./admin-panel";
export type { AdminPanelOptions } from "./admin-panel";

export function toElysiaPlugin(cms: CMSInstance) {
	return new Elysia({ prefix: "/cms" })
		.use(translationRoutes(cms))
		.use(adminRoutes(cms))
		.use(userRoutes(cms))
		.use(cms.elysiaApp);
}
