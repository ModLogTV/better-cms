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
	const app = new Elysia({ prefix: "/cms" })
		.use(translationRoutes(cms))
		.use(adminRoutes(cms))
		.use(userRoutes(cms));

	// Apply plugin-queued route mounts (pagesPlugin, mediaPlugin) — these were
	// recorded by core's dependency-free ElysiaMountQueue, not a real Elysia
	// instance. This is the one place they're materialized against a real app.
	for (const mount of cms.elysiaApp.mounts) {
		app.use(mount as Parameters<typeof app.use>[0]);
	}

	return app;
}
