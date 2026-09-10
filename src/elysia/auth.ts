import { Elysia } from "elysia";
import type { CMSAuthAdapter } from "../auth/adapter";
import type { CMSPermission } from "../auth/permissions";
import { hasPermission } from "../auth/permissions";

interface WithAuth {
	auth: CMSAuthAdapter;
}

/**
 * Elysia middleware that verifies the request and checks the given permissions.
 * Returns 401 if not authorized, 403 if authorized but missing a permission.
 * Injects `cmsUserId` and `cmsPermissions` into the handler context.
 *
 * @example
 * ```ts
 * app.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.TRANSLATIONS_READ] }))
 * ```
 */
export function requirePermission(opts: {
	cms: WithAuth;
	permissions: CMSPermission[];
}) {
	const { cms, permissions } = opts;
	const name = `cms-perm:${permissions.slice().sort().join(",")}`;
	return new Elysia({ name }).derive(
		{ as: "scoped" },
		async ({ headers, set }) => {
			const result = await cms.auth.verifyRequest(
				headers as Record<string, string | undefined>,
			);
			if (!result.authorized) {
				set.status = 401;
				return { error: "Unauthorized" };
			}
			for (const perm of permissions) {
				if (!hasPermission({ userPerms: result.permissions, required: perm })) {
					set.status = 403;
					return { error: "Forbidden", required: perm };
				}
			}
			return {
				cmsUserId: result.userId,
				cmsPermissions: result.permissions,
				cmsGroupIds: result.groupIds ?? [],
			};
		},
	);
}

/** Shorthand: requires that the request is authorized (any valid credentials). */
export function requireAuth(opts: { cms: WithAuth }) {
	return new Elysia({ name: "cms-auth" }).derive(
		{ as: "scoped" },
		async ({ headers, set }) => {
			const result = await opts.cms.auth.verifyRequest(
				headers as Record<string, string | undefined>,
			);
			if (!result.authorized) {
				set.status = 401;
				return { error: "Unauthorized" };
			}
			return {
				cmsUserId: result.userId,
				cmsPermissions: result.permissions,
				cmsGroupIds: result.groupIds ?? [],
			};
		},
	);
}
