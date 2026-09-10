import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { Elysia } from "elysia";

const MIME: Record<string, string> = {
	".js": "application/javascript; charset=utf-8",
	".mjs": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".map": "application/json",
};

export interface AdminPanelOptions {
	/** Mount path for the admin panel. Default: `/admin` */
	basePath?: string;
	/** Base path of the CMS API (served by toElysiaPlugin). Default: `/cms` */
	apiBasePath?: string;
	/** Base path of the better-auth API. Default: `/api/auth` */
	authBasePath?: string;
	/**
	 * Base URL of the site that renders your pages (e.g. `https://example.com`).
	 * When set, each page in the admin panel's tree gets an "open in new tab"
	 * link to `${siteUrl}${page.path}`. Omit to hide that link - the CMS has
	 * no public-facing page route of its own (unlike media), since pages are
	 * rendered by your frontend app's own routing, which the CMS can't infer.
	 */
	siteUrl?: string;
}

/**
 * Mounts the pre-built better-cms admin panel as static files on your Elysia server.
 *
 * Requires running `bun run build:admin` (or `bun run build`) once first to produce
 * the `dist/admin-panel/` assets that are shipped with the package.
 *
 * @example
 * ```ts
 * import { Elysia } from "elysia"
 * import { toElysiaPlugin, adminPanelPlugin } from "@modlog/better-cms/elysia"
 *
 * const app = new Elysia()
 *   .use(toElysiaPlugin(cms))
 *   .use(adminPanelPlugin())
 *   .listen(3000)
 * // Admin panel now at http://localhost:3000/admin
 * ```
 */
export function adminPanelPlugin(opts: AdminPanelOptions = {}) {
	const {
		basePath = "/admin",
		apiBasePath = "/cms",
		authBasePath = "/api/auth",
		siteUrl,
	} = opts;

	// In the published package: this file is at dist/elysia/*.js
	// Admin panel assets are at dist/admin-panel/
	const distDir = join(__dirname, "../admin-panel");

	const runtimeConfig = JSON.stringify({
		apiBasePath,
		authBasePath,
		basePath,
		siteUrl,
	});

	function injectConfig(html: string): string {
		// Vite builds this SPA with a relative base ("./assets/...") so it can be
		// mounted at any basePath. Without an explicit <base>, a request to
		// "/admin" (no trailing slash) makes the browser resolve those relative
		// paths one directory too high (e.g. "/assets/x.js" instead of
		// "/admin/assets/x.js"), 404ing every asset. <base> must be inserted right
		// after the opening <head> tag, not before </head> - per spec it only
		// affects elements parsed after it, and Vite's own <script src="./assets/...">
		// and <link href="./assets/..."> tags are earlier in <head> than that.
		return html
			.replace("<head>", `<head><base href="${basePath}/">`)
			.replace(
				"</head>",
				`<script>window.__CMS_ADMIN_CONFIG__=${runtimeConfig};</script></head>`,
			);
	}

	function serveIndex(set: {
		headers: Record<string, unknown>;
		status?: unknown;
	}) {
		const indexPath = join(distDir, "index.html");
		if (!existsSync(indexPath)) {
			set.status = 503;
			return (
				"Admin panel assets not found.\n" +
				"Run `bun run build:admin` to build the admin UI first.\n" +
				`Expected assets at: ${distDir}`
			);
		}
		const html = readFileSync(indexPath, "utf-8");
		set.headers["content-type"] = "text/html; charset=utf-8";
		set.headers["cache-control"] = "no-cache";
		return injectConfig(html);
	}

	return new Elysia({ prefix: basePath, name: "cms-admin-panel" })
		.get("/", ({ set }) => serveIndex(set))
		.get("/assets/*", ({ params, set }) => {
			const filePath = join(
				distDir,
				"assets",
				(params as Record<string, string>)["*"],
			);
			if (!existsSync(filePath)) {
				set.status = 404;
				return "Not found";
			}
			const ext = extname(filePath);
			set.headers["content-type"] = MIME[ext] ?? "application/octet-stream";
			set.headers["cache-control"] = "public, max-age=31536000, immutable";
			return readFileSync(filePath);
		})
		.get("/*", ({ set }) => serveIndex(set));
}
