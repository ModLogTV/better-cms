import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSInstance } from "../../core/index";
import { requirePermission } from "../auth";

/**
 * Mounts user and group management routes.
 * Only registered when `cms.auth.management` is defined.
 */
export function userRoutes(cms: CMSInstance) {
	if (!cms.auth.management) return new Elysia();

	const mgmt = cms.auth.management;

	return new Elysia({ prefix: "/admin" })
		.use(
			requirePermission({ cms, permissions: [CMS_PERMISSIONS.USERS_MANAGE] }),
		)
		.get("/users", () => mgmt.listUsers())
		.get("/users/:userId/permissions", ({ params }) =>
			mgmt.getUserPermissions({ userId: params.userId }),
		)
		.put(
			"/users/:userId/permissions",
			async ({ params, body }) => {
				await mgmt.setUserPermissions({
					userId: params.userId,
					permissions: body.permissions,
				});
				return { ok: true };
			},
			{
				params: t.Object({ userId: t.String() }),
				body: t.Object({ permissions: t.Array(t.String()) }),
			},
		)
		.get("/users/:userId/groups", ({ params }) =>
			mgmt.getUserGroups({ userId: params.userId }),
		)
		.post(
			"/users/:userId/groups",
			async ({ params, body }) => {
				await mgmt.addUserToGroup({
					userId: params.userId,
					groupId: body.groupId,
				});
				return { ok: true };
			},
			{
				params: t.Object({ userId: t.String() }),
				body: t.Object({ groupId: t.String() }),
			},
		)
		.delete(
			"/users/:userId/groups/:groupId",
			async ({ params }) => {
				await mgmt.removeUserFromGroup({
					userId: params.userId,
					groupId: params.groupId,
				});
				return { ok: true };
			},
			{
				params: t.Object({ userId: t.String(), groupId: t.String() }),
			},
		)
		.use(
			requirePermission({ cms, permissions: [CMS_PERMISSIONS.GROUPS_MANAGE] }),
		)
		.get("/groups", () => mgmt.listGroups())
		.post(
			"/groups",
			async ({ body }) => {
				return mgmt.createGroup({
					name: body.name,
					permissions: body.permissions,
				});
			},
			{
				body: t.Object({
					name: t.String(),
					permissions: t.Array(t.String()),
				}),
			},
		)
		.put(
			"/groups/:groupId",
			async ({ params, body }) => {
				return mgmt.updateGroup({
					id: params.groupId,
					name: body.name,
					permissions: body.permissions,
				});
			},
			{
				params: t.Object({ groupId: t.String() }),
				body: t.Object({
					name: t.Optional(t.String()),
					permissions: t.Optional(t.Array(t.String())),
				}),
			},
		)
		.delete(
			"/groups/:groupId",
			async ({ params }) => {
				await mgmt.deleteGroup({ id: params.groupId });
				return { ok: true };
			},
			{
				params: t.Object({ groupId: t.String() }),
			},
		);
}
