import { Elysia } from "elysia";
import type { CMSAuthAdapter } from "../auth/adapter";
import type { CMSPermission } from "../auth/permissions";
import { hasPermission } from "../auth/permissions";

interface WithAuth {
	auth: CMSAuthAdapter;
}

/**
 * Verifies the request once and stashes the result in context. Deliberately
 * does NOT reject here - `.derive()` augments context but never stops the
 * request (confirmed against elysia 1.4.28: a `set.status = 403` plus an
 * early return from `.derive()` still lets the route handler run, so a
 * "gate" implemented as `.derive()` alone reports the right status code
 * while the handler's side effects execute anyway). The actual reject/allow
 * decision lives in `.onBeforeHandle()` below, which does short-circuit.
 */
function verifyAuth(cms: WithAuth) {
	// No `name` here deliberately: Elysia dedupes plugins that share a name
	// across the whole app, and every permission group calls this factory -
	// naming it would make only the FIRST group's derive actually run,
	// leaving every other gate's context empty (and thus always 401).
	// `as: "global"` (not "scoped"): this instance is nested two levels deep
	// (route group -> requirePermission/requireAuth -> verifyAuth), and
	// "scoped" only propagates one level up, so route handlers wouldn't see
	// cmsUserId/cmsPermissions/cmsGroupIds without going all the way up.
	return new Elysia().derive({ as: "global" }, async ({ headers }) => {
		const result = await cms.auth.verifyRequest(
			headers as Record<string, string | undefined>,
		);
		return {
			cmsUserId: result.userId,
			cmsPermissions: result.permissions,
			cmsGroupIds: result.groupIds ?? [],
			cmsAuthorized: result.authorized,
		};
	});
}

/**
 * Elysia middleware that verifies the request and checks the given permissions.
 * Returns 401 if not authorized, 403 if authorized but missing a permission -
 * and actually stops the request in both cases (see `verifyAuth` above).
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
	return new Elysia({ name })
		.use(verifyAuth(cms))
		.onBeforeHandle(
			{ as: "scoped" },
			({ set, cmsAuthorized, cmsPermissions }) => {
				if (!cmsAuthorized) {
					set.status = 401;
					return { error: "Unauthorized" };
				}
				for (const perm of permissions) {
					if (!hasPermission({ userPerms: cmsPermissions, required: perm })) {
						set.status = 403;
						return { error: "Forbidden", required: perm };
					}
				}
			},
		);
}

/** Shorthand: requires that the request is authorized (any valid credentials). */
export function requireAuth(opts: { cms: WithAuth }) {
	return new Elysia({ name: "cms-auth" })
		.use(verifyAuth(opts.cms))
		.onBeforeHandle({ as: "scoped" }, ({ set, cmsAuthorized }) => {
			if (!cmsAuthorized) {
				set.status = 401;
				return { error: "Unauthorized" };
			}
		});
}
