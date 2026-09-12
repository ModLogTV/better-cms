import type {
	CMSAuthAdapter,
	CMSAuthManagement,
	CMSAuthResult,
	CMSGroup,
	CMSUserSummary,
	GroupMembershipEdge,
	ListUsersParams,
} from "../auth/adapter";
import { CMS_WILDCARD_PERMISSION } from "../auth/permissions";

interface BetterAuthLike {
	api: {
		getSession(opts: {
			headers: Headers;
		}): Promise<{ user: { id: string; email: string; name: string } } | null>;
		signUpEmail(opts: {
			body: { email: string; password: string; name: string };
		}): Promise<unknown>;
	};
}

interface BetterAuthUser {
	id: string;
	email: string;
	name: string;
	cmsPermissions: string[];
	cmsGroups: Array<{ groupId: string; group: BetterAuthCmsGroup }>;
}

interface BetterAuthCmsGroup {
	id: string;
	name: string;
	permissions: string[];
}

interface BetterAuthUserWhere {
	OR?: Array<{
		name?: { contains: string; mode: "insensitive" };
		email?: { contains: string; mode: "insensitive" };
		id?: { contains: string; mode: "insensitive" };
	}>;
	cmsPermissions?: { has: string };
}

interface BetterAuthPrismaLike {
	user: {
		findUnique(args: {
			where: { id?: string; email?: string };
			include?: {
				cmsGroups?: { include?: { group?: boolean } };
			};
		}): Promise<BetterAuthUser | null>;
		update(args: {
			where: { id?: string; email?: string };
			data: { cmsPermissions?: string[] };
		}): Promise<BetterAuthUser>;
		findMany(args?: {
			where?: BetterAuthUserWhere;
			orderBy?: Record<string, "asc" | "desc">[];
			skip?: number;
			take?: number;
			include?: { cmsGroups?: { include?: { group?: boolean } } };
		}): Promise<BetterAuthUser[]>;
		count(args?: { where?: BetterAuthUserWhere }): Promise<number>;
	};
	cmsGroup: {
		findMany(): Promise<BetterAuthCmsGroup[]>;
		findUnique(args: {
			where: { id: string };
		}): Promise<BetterAuthCmsGroup | null>;
		create(args: {
			data: { name: string; permissions: string[] };
		}): Promise<BetterAuthCmsGroup>;
		update(args: {
			where: { id: string };
			data: Partial<{ name: string; permissions: string[] }>;
		}): Promise<BetterAuthCmsGroup>;
		delete(args: { where: { id: string } }): Promise<unknown>;
	};
	cmsUserGroup: {
		create(args: {
			data: { userId: string; groupId: string };
		}): Promise<unknown>;
		delete(args: {
			where: { userId_groupId: { userId: string; groupId: string } };
		}): Promise<unknown>;
	};
	groupMembership: {
		findMany(): Promise<GroupMembershipEdge[]>;
		create(args: {
			data: { childGroupId: string; parentGroupId: string };
		}): Promise<unknown>;
		delete(args: {
			where: {
				childGroupId_parentGroupId: {
					childGroupId: string;
					parentGroupId: string;
				};
			};
		}): Promise<unknown>;
	};
}

interface BetterAuthCMSAdapterOptions {
	auth: BetterAuthLike;
	prisma: BetterAuthPrismaLike;
	/**
	 * Optional service-level token for server-side reads without a user session.
	 * Accepted via `x-cms-token` or `x-internal-token` header.
	 * Grants read-only permissions (translations, locales, pages, admin-read).
	 */
	serviceToken?: string;
	/**
	 * Optional admin token for server-to-server admin operations (e.g. TanStack Start
	 * server functions). Accepted via `x-cms-token` or `x-internal-token` header.
	 * Grants wildcard (full) permissions - keep this secret and never expose to the browser.
	 */
	adminToken?: string;
}

async function resolvePermissions(
	prisma: BetterAuthPrismaLike,
	userId: string,
): Promise<string[]> {
	const { permissions } = await resolveUserAuth(prisma, userId);
	return permissions;
}

/**
 * Expands `directGroupIds` to include every group reachable by following
 * nesting edges upward (child -> parent, repeatedly) - the full ancestor
 * closure a member of any of `directGroupIds` effectively also belongs to.
 * Cycle-safe via a visited set (cycles are rejected at write time by
 * `wouldCreateCycle`, but this stays defensive regardless).
 */
function expandGroupAncestors(
	directGroupIds: string[],
	edges: GroupMembershipEdge[],
): string[] {
	const result = new Set(directGroupIds);
	const stack = [...directGroupIds];
	while (stack.length > 0) {
		const current = stack.pop() as string;
		for (const edge of edges) {
			if (edge.childGroupId === current && !result.has(edge.parentGroupId)) {
				result.add(edge.parentGroupId);
				stack.push(edge.parentGroupId);
			}
		}
	}
	return [...result];
}

/**
 * True if adding a child->parent nesting edge would create a cycle - i.e.
 * `childGroupId` is already a (transitive) ancestor of `parentGroupId` via
 * existing edges, which would loop back to itself once the new edge lands.
 */
async function wouldCreateCycle(
	prisma: BetterAuthPrismaLike,
	opts: { childGroupId: string; parentGroupId: string },
): Promise<boolean> {
	if (opts.childGroupId === opts.parentGroupId) return true;
	const edges = await prisma.groupMembership.findMany();
	const visited = new Set<string>();
	const stack = [opts.parentGroupId];
	while (stack.length > 0) {
		const current = stack.pop() as string;
		if (visited.has(current)) continue;
		visited.add(current);
		if (current === opts.childGroupId) return true;
		for (const edge of edges) {
			if (edge.childGroupId === current) stack.push(edge.parentGroupId);
		}
	}
	return false;
}

async function resolveUserAuth(
	prisma: BetterAuthPrismaLike,
	userId: string,
): Promise<{ permissions: string[]; groupIds: string[] }> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { cmsGroups: { include: { group: true } } },
	});
	if (!user) return { permissions: [], groupIds: [] };

	const directGroupIds = user.cmsGroups.map((ug) => ug.groupId);
	const directGroupPerms = user.cmsGroups.flatMap((ug) => ug.group.permissions);

	const edges = await prisma.groupMembership.findMany();
	const groupIds = expandGroupAncestors(directGroupIds, edges);

	// Ancestor groups (nested-in, but not a direct membership) aren't already
	// loaded via `cmsGroups.group` - fetch their permissions only when nesting
	// actually put some in scope, not on every request.
	const ancestorOnlyIds = groupIds.filter((id) => !directGroupIds.includes(id));
	const ancestorPerms =
		ancestorOnlyIds.length > 0
			? (await prisma.cmsGroup.findMany())
					.filter((g) => ancestorOnlyIds.includes(g.id))
					.flatMap((g) => g.permissions)
			: [];

	return {
		permissions: [
			...new Set([
				...user.cmsPermissions,
				...directGroupPerms,
				...ancestorPerms,
			]),
		],
		groupIds,
	};
}

function buildManagement(prisma: BetterAuthPrismaLike): CMSAuthManagement {
	return {
		async listUsers(params: ListUsersParams) {
			const where: BetterAuthUserWhere = {};
			if (params.search) {
				const contains = {
					contains: params.search,
					mode: "insensitive" as const,
				};
				where.OR = [{ name: contains }, { email: contains }, { id: contains }];
			}
			if (params.permission) {
				where.cmsPermissions = { has: params.permission };
			}

			const orderBy = (params.sort ?? []).map((s) => ({
				[s.id]: s.desc ? ("desc" as const) : ("asc" as const),
			}));

			const [users, total] = await Promise.all([
				prisma.user.findMany({
					where,
					orderBy: orderBy.length > 0 ? orderBy : [{ name: "asc" }],
					skip: (params.page - 1) * params.pageSize,
					take: params.pageSize,
					include: { cmsGroups: { include: { group: true } } },
				}),
				prisma.user.count({ where }),
			]);

			return {
				items: users.map(
					(u): CMSUserSummary => ({
						id: u.id,
						email: u.email,
						name: u.name,
						permissions: u.cmsPermissions,
						groupIds: u.cmsGroups.map((ug) => ug.groupId),
					}),
				),
				total,
			};
		},

		async getUserPermissions({ userId }) {
			return resolvePermissions(prisma, userId);
		},

		async setUserPermissions({ userId, permissions }) {
			await prisma.user.update({
				where: { id: userId },
				data: { cmsPermissions: permissions },
			});
		},

		async getUserGroups({ userId }) {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: { cmsGroups: { include: { group: true } } },
			});
			if (!user) return [];
			return user.cmsGroups.map(
				(ug): CMSGroup => ({
					id: ug.group.id,
					name: ug.group.name,
					permissions: ug.group.permissions,
				}),
			);
		},

		async addUserToGroup({ userId, groupId }) {
			await prisma.cmsUserGroup.create({ data: { userId, groupId } });
		},

		async removeUserFromGroup({ userId, groupId }) {
			await prisma.cmsUserGroup.delete({
				where: { userId_groupId: { userId, groupId } },
			});
		},

		async listGroups() {
			const groups = await prisma.cmsGroup.findMany();
			return groups.map(
				(g): CMSGroup => ({
					id: g.id,
					name: g.name,
					permissions: g.permissions,
				}),
			);
		},

		async createGroup({ name, permissions }) {
			const g = await prisma.cmsGroup.create({ data: { name, permissions } });
			return { id: g.id, name: g.name, permissions: g.permissions };
		},

		async updateGroup({ id, ...opts }) {
			const g = await prisma.cmsGroup.update({
				where: { id },
				data: opts,
			});
			return { id: g.id, name: g.name, permissions: g.permissions };
		},

		async deleteGroup({ id }) {
			await prisma.cmsGroup.delete({ where: { id } });
		},

		async listGroupMemberships() {
			return prisma.groupMembership.findMany();
		},

		async addGroupMembership({ childGroupId, parentGroupId }) {
			if (await wouldCreateCycle(prisma, { childGroupId, parentGroupId })) {
				throw new Error(
					"This would create a cycle - a group can't be nested inside itself, directly or transitively.",
				);
			}
			await prisma.groupMembership.create({
				data: { childGroupId, parentGroupId },
			});
		},

		async removeGroupMembership({ childGroupId, parentGroupId }) {
			await prisma.groupMembership.delete({
				where: { childGroupId_parentGroupId: { childGroupId, parentGroupId } },
			});
		},
	};
}

/** Read-only permission subset granted to service tokens. */
const SERVICE_TOKEN_PERMISSIONS = [
	"cms:translations:read",
	"cms:locales:read",
	"cms:pages:read",
	"cms:admin:read",
];

/**
 * Auth adapter that integrates better-auth sessions with granular CMS permissions.
 *
 * Users are resolved via better-auth sessions. Their permissions come from:
 * 1. Direct `cmsPermissions` on the user record
 * 2. Permissions inherited from `CmsGroup` memberships
 *
 * An optional `serviceToken` allows server-side frontend code to read translations
 * without a user session.
 *
 * @example
 * ```ts
 * import { betterAuthCMSAdapter } from "better-cms/better-auth"
 *
 * const cms = createCMs({
 *   auth: betterAuthCMSAdapter({ auth, prisma }),
 *   initialAdminUser: {
 *     email: "admin@example.com",
 *     name: "Admin",
 *     password: process.env.ADMIN_PASSWORD!,
 *   },
 * })
 * ```
 */
export function betterAuthCMSAdapter(
	opts: BetterAuthCMSAdapterOptions,
): CMSAuthAdapter {
	return {
		async verifyRequest(headers): Promise<CMSAuthResult> {
			const token = headers["x-cms-token"] ?? headers["x-internal-token"];

			// 1. Check admin token (full permissions - server-to-server only)
			if (opts.adminToken && token === opts.adminToken) {
				return { authorized: true, permissions: [CMS_WILDCARD_PERMISSION] };
			}

			// 2. Check service token (read-only - for frontend SSR)
			if (opts.serviceToken && token === opts.serviceToken) {
				return { authorized: true, permissions: SERVICE_TOKEN_PERMISSIONS };
			}

			// 3. Resolve better-auth session
			const session = await opts.auth.api.getSession({
				headers: new Headers(headers as Record<string, string>),
			});
			if (!session) return { authorized: false, permissions: [] };

			const { permissions, groupIds } = await resolveUserAuth(
				opts.prisma,
				session.user.id,
			);
			return {
				authorized: true,
				permissions,
				userId: session.user.id,
				groupIds,
			};
		},

		async upsertAdminUser(user) {
			const existing = await opts.prisma.user.findUnique({
				where: { email: user.email },
			});

			if (!existing) {
				await opts.auth.api.signUpEmail({
					body: { email: user.email, password: user.password, name: user.name },
				});
			}

			// Ensure wildcard permission
			const target = await opts.prisma.user.findUnique({
				where: { email: user.email },
			});
			if (!target) {
				throw new Error(
					`betterAuthCMSAdapter: failed to find user after creation (email: ${user.email})`,
				);
			}

			if (!target.cmsPermissions.includes(CMS_WILDCARD_PERMISSION)) {
				await opts.prisma.user.update({
					where: { id: target.id },
					data: { cmsPermissions: [CMS_WILDCARD_PERMISSION] },
				});
			}
		},

		management: buildManagement(opts.prisma),
	};
}
