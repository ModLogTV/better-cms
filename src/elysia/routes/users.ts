import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSInstance } from "../../core/index";
import { requirePermission } from "../auth";
import { parseSort } from "../pagination";

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
		.get(
			"/users",
			({ query }) =>
				mgmt.listUsers({
					page: query.page ? Number(query.page) : 1,
					pageSize: query.pageSize ? Number(query.pageSize) : 20,
					sort: parseSort(query.sort),
					search: query.search,
					permission: query.permission,
				}),
			{
				query: t.Object({
					page: t.Optional(t.String()),
					pageSize: t.Optional(t.String()),
					sort: t.Optional(t.String()),
					search: t.Optional(t.String()),
					permission: t.Optional(t.String()),
				}),
			},
		)
		.get("/users/:userId/permissions", ({ params }) =>
			mgmt.getUserPermissions({ userId: params.userId }),
		)
		.put(
			"/users/:userId/permissions",
			async ({ params, body, cmsUserId }) => {
				const before = await mgmt.getUserPermissions({
					userId: params.userId,
				});
				await mgmt.setUserPermissions({
					userId: params.userId,
					permissions: body.permissions,
				});
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "user.permissions.updated",
					targetType: "user",
					targetId: params.userId,
					detail: { before, after: body.permissions },
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
			async ({ params, body, cmsUserId }) => {
				await mgmt.addUserToGroup({
					userId: params.userId,
					groupId: body.groupId,
				});
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "user.group.added",
					targetType: "user",
					targetId: params.userId,
					detail: { groupId: body.groupId },
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
			async ({ params, cmsUserId }) => {
				await mgmt.removeUserFromGroup({
					userId: params.userId,
					groupId: params.groupId,
				});
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "user.group.removed",
					targetType: "user",
					targetId: params.userId,
					detail: { groupId: params.groupId },
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
			async ({ body, cmsUserId }) => {
				const group = await mgmt.createGroup({
					name: body.name,
					permissions: body.permissions,
				});
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "group.created",
					targetType: "group",
					targetId: group.id,
					detail: { name: group.name, permissions: group.permissions },
				});
				return group;
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
			async ({ params, body, cmsUserId }) => {
				const groups = await mgmt.listGroups();
				const before = groups.find((g) => g.id === params.groupId);
				const group = await mgmt.updateGroup({
					id: params.groupId,
					name: body.name,
					permissions: body.permissions,
				});
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "group.updated",
					targetType: "group",
					targetId: params.groupId,
					detail: {
						before: before && {
							name: before.name,
							permissions: before.permissions,
						},
						after: { name: group.name, permissions: group.permissions },
					},
				});
				return group;
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
			async ({ params, cmsUserId }) => {
				const groups = await mgmt.listGroups();
				const before = groups.find((g) => g.id === params.groupId);
				await mgmt.deleteGroup({ id: params.groupId });
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "group.deleted",
					targetType: "group",
					targetId: params.groupId,
					detail: before ? { name: before.name } : {},
				});
				return { ok: true };
			},
			{
				params: t.Object({ groupId: t.String() }),
			},
		)
		.get("/group-memberships", () => mgmt.listGroupMemberships())
		.post(
			"/groups/:groupId/memberships",
			async ({ params, body, set, cmsUserId }) => {
				try {
					await mgmt.addGroupMembership({
						childGroupId: params.groupId,
						parentGroupId: body.parentGroupId,
					});
				} catch (err) {
					set.status = 409;
					return {
						error:
							err instanceof Error ? err.message : "Couldn't nest this group",
					};
				}
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "group.membership.added",
					targetType: "group",
					targetId: params.groupId,
					detail: { parentGroupId: body.parentGroupId },
				});
				return { ok: true };
			},
			{
				params: t.Object({ groupId: t.String() }),
				body: t.Object({ parentGroupId: t.String() }),
			},
		)
		.delete(
			"/groups/:groupId/memberships/:parentGroupId",
			async ({ params, cmsUserId }) => {
				await mgmt.removeGroupMembership({
					childGroupId: params.groupId,
					parentGroupId: params.parentGroupId,
				});
				await cms.adapter.recordAuditEntry({
					actorId: cmsUserId,
					action: "group.membership.removed",
					targetType: "group",
					targetId: params.groupId,
					detail: { parentGroupId: params.parentGroupId },
				});
				return { ok: true };
			},
			{
				params: t.Object({ groupId: t.String(), parentGroupId: t.String() }),
			},
		);
}
