import type { CMSAuthAdapter } from "./adapter";
import { CMS_PERMISSIONS, CMS_WILDCARD_PERMISSION } from "./permissions";

/**
 * Simple token-based auth adapter.
 * Accepts `x-cms-token` or `x-internal-token` (legacy) headers.
 *
 * - `adminToken` → wildcard permission (all operations allowed)
 * - `readToken` → read-only permission subset
 *
 * Use this adapter when you don't need user-level auth or are migrating
 * from the old `auth: { readToken, adminToken }` config.
 *
 * @example
 * ```ts
 * import { tokenAuthAdapter } from "better-cms/auth"
 *
 * const cms = createCMS({
 *   auth: tokenAuthAdapter({
 *     readToken: process.env.CMS_READ_TOKEN!,
 *     adminToken: process.env.CMS_ADMIN_TOKEN!,
 *   }),
 * })
 * ```
 */
export function tokenAuthAdapter(opts: {
	readToken: string;
	adminToken: string;
}): CMSAuthAdapter {
	if (!opts.readToken) throw new Error("tokenAuthAdapter: readToken must not be empty");
	if (!opts.adminToken) throw new Error("tokenAuthAdapter: adminToken must not be empty");

	return {
		async verifyRequest(headers) {
			const token = headers["x-cms-token"] ?? headers["x-internal-token"];
			if (!token) return { authorized: false, permissions: [] };

			if (token === opts.adminToken) {
				return { authorized: true, permissions: [CMS_WILDCARD_PERMISSION] };
			}

			if (token === opts.readToken) {
				return {
					authorized: true,
					permissions: [
						CMS_PERMISSIONS.TRANSLATIONS_READ,
						CMS_PERMISSIONS.LOCALES_READ,
						CMS_PERMISSIONS.PAGES_READ,
						CMS_PERMISSIONS.ADMIN_READ,
					],
				};
			}

			return { authorized: false, permissions: [] };
		},
	};
}
