import { describe, expect, mock, test } from "bun:test";
import { CMS_WILDCARD_PERMISSION } from "../../auth/permissions";
import { betterAuthCMSAdapter } from "../index";

type BetterAuthAdapter = ReturnType<typeof betterAuthCMSAdapter>;

/** These tests always configure `management` — narrow it once instead of `!` at every call site. */
function requireManagement(adapter: BetterAuthAdapter) {
	if (!adapter.management)
		throw new Error("expected adapter.management to be defined");
	return adapter.management;
}

/** Same as requireManagement, for the optional `upsertAdminUser` method. */
function requireUpsertAdminUser(adapter: BetterAuthAdapter) {
	if (!adapter.upsertAdminUser)
		throw new Error("expected adapter.upsertAdminUser to be defined");
	return adapter.upsertAdminUser;
}

// ---------------------------------------------------------------------------
// Minimal fakes
// ---------------------------------------------------------------------------

type FakeUser = {
	id: string;
	email: string;
	name: string;
	cmsPermissions: string[];
	cmsGroups: Array<{
		groupId: string;
		group: { id: string; name: string; permissions: string[] };
	}>;
};

type FakeGroup = { id: string; name: string; permissions: string[] };

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
	return {
		id: "user-1",
		email: "alice@example.com",
		name: "Alice",
		cmsPermissions: [],
		cmsGroups: [],
		...overrides,
	};
}

function makeGroup(overrides: Partial<FakeGroup> = {}): FakeGroup {
	return { id: "group-1", name: "Editors", permissions: [], ...overrides };
}

type FakePrisma = {
	user: {
		findUnique: ReturnType<typeof mock>;
		update: ReturnType<typeof mock>;
		findMany: ReturnType<typeof mock>;
	};
	cmsGroup: {
		findMany: ReturnType<typeof mock>;
		findUnique: ReturnType<typeof mock>;
		create: ReturnType<typeof mock>;
		update: ReturnType<typeof mock>;
		delete: ReturnType<typeof mock>;
	};
	cmsUserGroup: {
		create: ReturnType<typeof mock>;
		delete: ReturnType<typeof mock>;
	};
};

function makePrisma(
	overrides: {
		user?: Partial<FakePrisma["user"]>;
		cmsGroup?: Partial<FakePrisma["cmsGroup"]>;
		cmsUserGroup?: Partial<FakePrisma["cmsUserGroup"]>;
	} = {},
): FakePrisma {
	return {
		user: {
			findUnique: mock(async () => makeUser()),
			update: mock(async () => makeUser()),
			findMany: mock(async () => [makeUser()]),
			...overrides.user,
		},
		cmsGroup: {
			findMany: mock(async () => [makeGroup()]),
			findUnique: mock(async () => makeGroup()),
			create: mock(async (args: { data: FakeGroup }) => makeGroup(args.data)),
			update: mock(
				async (args: { where: { id: string }; data: Partial<FakeGroup> }) =>
					makeGroup({ id: args.where.id, ...args.data }),
			),
			delete: mock(async () => {}),
			...overrides.cmsGroup,
		},
		cmsUserGroup: {
			create: mock(async () => {}),
			delete: mock(async () => {}),
			...overrides.cmsUserGroup,
		},
	};
}

function makeAuth(
	sessionUser?: { id: string; email: string; name: string } | null,
) {
	const user =
		sessionUser === undefined
			? { id: "user-1", email: "alice@example.com", name: "Alice" }
			: sessionUser;
	return {
		api: {
			getSession: mock(async () => (user ? { user } : null)),
			signUpEmail: mock(async () => ({})),
		},
	};
}

// ---------------------------------------------------------------------------
// verifyRequest
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – verifyRequest", () => {
	test("resolves session and returns user permissions", async () => {
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({ cmsPermissions: ["cms:translations:read"] }),
				),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const result = await adapter.verifyRequest({ cookie: "session=abc" });

		expect(result.authorized).toBe(true);
		expect(result.userId).toBe("user-1");
		expect(result.permissions).toContain("cms:translations:read");
	});

	test("merges group permissions with direct permissions", async () => {
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({
						cmsPermissions: ["cms:locales:read"],
						cmsGroups: [
							{
								groupId: "g1",
								group: makeGroup({ permissions: ["cms:pages:write"] }),
							},
						],
					}),
				),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const result = await adapter.verifyRequest({});

		expect(result.permissions).toContain("cms:locales:read");
		expect(result.permissions).toContain("cms:pages:write");
	});

	test("deduplicates permissions across direct and groups", async () => {
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({
						cmsPermissions: ["cms:locales:read"],
						cmsGroups: [
							{
								groupId: "g1",
								group: makeGroup({ permissions: ["cms:locales:read"] }),
							},
						],
					}),
				),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const result = await adapter.verifyRequest({});

		const count = result.permissions.filter(
			(p) => p === "cms:locales:read",
		).length;
		expect(count).toBe(1);
	});

	test("returns unauthorized when no session", async () => {
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(null),
			prisma: makePrisma() as never,
		});

		const result = await adapter.verifyRequest({});

		expect(result.authorized).toBe(false);
		expect(result.permissions).toHaveLength(0);
	});

	test("returns empty permissions when user not found in DB", async () => {
		const prisma = makePrisma({
			user: { findUnique: mock(async () => null as never) },
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const result = await adapter.verifyRequest({});

		expect(result.authorized).toBe(true);
		expect(result.permissions).toHaveLength(0);
	});

	test("serviceToken grants read-only permissions", async () => {
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(null),
			prisma: makePrisma() as never,
			serviceToken: "svc-secret",
		});

		const result = await adapter.verifyRequest({ "x-cms-token": "svc-secret" });

		expect(result.authorized).toBe(true);
		expect(result.permissions).toContain("cms:translations:read");
		expect(result.permissions).toContain("cms:locales:read");
		expect(result.permissions).toContain("cms:pages:read");
		expect(result.permissions).toContain("cms:admin:read");
		expect(result.permissions).not.toContain(CMS_WILDCARD_PERMISSION);
	});

	test("serviceToken accepted via x-internal-token header", async () => {
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(null),
			prisma: makePrisma() as never,
			serviceToken: "svc-secret",
		});

		const result = await adapter.verifyRequest({
			"x-internal-token": "svc-secret",
		});

		expect(result.authorized).toBe(true);
		expect(result.permissions).toContain("cms:translations:read");
	});

	test("wrong serviceToken falls through to session check and fails", async () => {
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(null),
			prisma: makePrisma() as never,
			serviceToken: "svc-secret",
		});

		const result = await adapter.verifyRequest({ "x-cms-token": "wrong" });

		expect(result.authorized).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// upsertAdminUser
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – upsertAdminUser", () => {
	test("creates user via signUpEmail when user does not exist", async () => {
		let callCount = 0;
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () => {
					callCount++;
					// first call (existence check) → null, second call (post-create) → user
					return callCount === 1
						? (null as never)
						: makeUser({ cmsPermissions: [] });
				}),
			},
		});
		const auth = makeAuth();
		const adapter = betterAuthCMSAdapter({ auth, prisma: prisma as never });

		await requireUpsertAdminUser(adapter)({
			email: "admin@example.com",
			name: "Admin",
			password: "secret",
		});

		expect(auth.api.signUpEmail).toHaveBeenCalledTimes(1);
		const call = (auth.api.signUpEmail.mock.calls as unknown[][])[0][0] as {
			body: { email: string; name: string };
		};
		expect(call.body.email).toBe("admin@example.com");
		expect(call.body.name).toBe("Admin");
	});

	test("skips signUpEmail when user already exists", async () => {
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({ cmsPermissions: [CMS_WILDCARD_PERMISSION] }),
				),
			},
		});
		const auth = makeAuth();
		const adapter = betterAuthCMSAdapter({ auth, prisma: prisma as never });

		await requireUpsertAdminUser(adapter)({
			email: "admin@example.com",
			name: "Admin",
			password: "secret",
		});

		expect(auth.api.signUpEmail).not.toHaveBeenCalled();
	});

	test("grants wildcard permission when not already set", async () => {
		const updateMock = mock(async () => makeUser());
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () => makeUser({ cmsPermissions: [] })),
				update: updateMock,
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireUpsertAdminUser(adapter)({
			email: "admin@example.com",
			name: "Admin",
			password: "secret",
		});

		expect(updateMock).toHaveBeenCalledTimes(1);
		const args = (updateMock.mock.calls as unknown[][])[0][0] as {
			data: { cmsPermissions: string[] };
		};
		expect(args.data.cmsPermissions).toContain(CMS_WILDCARD_PERMISSION);
	});

	test("skips permission update when wildcard already set", async () => {
		const updateMock = mock(async () => makeUser());
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({ cmsPermissions: [CMS_WILDCARD_PERMISSION] }),
				),
				update: updateMock,
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireUpsertAdminUser(adapter)({
			email: "admin@example.com",
			name: "Admin",
			password: "secret",
		});

		expect(updateMock).not.toHaveBeenCalled();
	});

	test("throws when user cannot be found after creation", async () => {
		const prisma = makePrisma({
			user: { findUnique: mock(async () => null as never) },
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await expect(
			requireUpsertAdminUser(adapter)({
				email: "admin@example.com",
				name: "Admin",
				password: "secret",
			}),
		).rejects.toThrow("failed to find user after creation");
	});
});

// ---------------------------------------------------------------------------
// management.listUsers
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – management.listUsers", () => {
	test("maps user records to CMSUserSummary", async () => {
		const prisma = makePrisma({
			user: {
				findMany: mock(async () => [
					makeUser({
						id: "u1",
						email: "a@x.com",
						cmsPermissions: ["cms:*"],
						cmsGroups: [{ groupId: "g1", group: makeGroup() }],
					}),
				]),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const users = await requireManagement(adapter).listUsers();

		expect(users).toHaveLength(1);
		expect(users[0].id).toBe("u1");
		expect(users[0].email).toBe("a@x.com");
		expect(users[0].permissions).toContain("cms:*");
		expect(users[0].groupIds).toContain("g1");
	});
});

// ---------------------------------------------------------------------------
// management.getUserPermissions
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – management.getUserPermissions", () => {
	test("resolves merged permissions", async () => {
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({
						cmsPermissions: ["cms:locales:read"],
						cmsGroups: [
							{
								groupId: "g1",
								group: makeGroup({ permissions: ["cms:pages:write"] }),
							},
						],
					}),
				),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const perms = await requireManagement(adapter).getUserPermissions({
			userId: "user-1",
		});

		expect(perms).toContain("cms:locales:read");
		expect(perms).toContain("cms:pages:write");
	});
});

// ---------------------------------------------------------------------------
// management.setUserPermissions
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – management.setUserPermissions", () => {
	test("calls prisma.user.update with new permissions", async () => {
		const updateMock = mock(async () => makeUser());
		const prisma = makePrisma({ user: { update: updateMock } });
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireManagement(adapter).setUserPermissions({
			userId: "user-1",
			permissions: ["cms:translations:write"],
		});

		expect(updateMock).toHaveBeenCalledTimes(1);
		const args = (updateMock.mock.calls as unknown[][])[0][0] as {
			where: { id: string };
			data: { cmsPermissions: string[] };
		};
		expect(args.where.id).toBe("user-1");
		expect(args.data.cmsPermissions).toEqual(["cms:translations:write"]);
	});
});

// ---------------------------------------------------------------------------
// management.getUserGroups
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – management.getUserGroups", () => {
	test("returns groups from user record", async () => {
		const prisma = makePrisma({
			user: {
				findUnique: mock(async () =>
					makeUser({
						cmsGroups: [
							{
								groupId: "g1",
								group: makeGroup({
									id: "g1",
									name: "Editors",
									permissions: ["cms:pages:write"],
								}),
							},
						],
					}),
				),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const groups = await requireManagement(adapter).getUserGroups({
			userId: "user-1",
		});

		expect(groups).toHaveLength(1);
		expect(groups[0].id).toBe("g1");
		expect(groups[0].name).toBe("Editors");
		expect(groups[0].permissions).toContain("cms:pages:write");
	});

	test("returns empty array when user not found", async () => {
		const prisma = makePrisma({
			user: { findUnique: mock(async () => null as never) },
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const groups = await requireManagement(adapter).getUserGroups({
			userId: "missing",
		});

		expect(groups).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// management.addUserToGroup / removeUserFromGroup
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – management group membership", () => {
	test("addUserToGroup calls cmsUserGroup.create with correct data", async () => {
		const createMock = mock(async () => {});
		const prisma = makePrisma({ cmsUserGroup: { create: createMock } });
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireManagement(adapter).addUserToGroup({
			userId: "u1",
			groupId: "g1",
		});

		expect(createMock).toHaveBeenCalledTimes(1);
		const args = (createMock.mock.calls as unknown[][])[0][0] as {
			data: { userId: string; groupId: string };
		};
		expect(args.data).toEqual({ userId: "u1", groupId: "g1" });
	});

	test("removeUserFromGroup calls cmsUserGroup.delete with composite key", async () => {
		const deleteMock = mock(async () => {});
		const prisma = makePrisma({ cmsUserGroup: { delete: deleteMock } });
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireManagement(adapter).removeUserFromGroup({
			userId: "u1",
			groupId: "g1",
		});

		expect(deleteMock).toHaveBeenCalledTimes(1);
		const args = (deleteMock.mock.calls as unknown[][])[0][0] as {
			where: { userId_groupId: { userId: string; groupId: string } };
		};
		expect(args.where.userId_groupId).toEqual({ userId: "u1", groupId: "g1" });
	});
});

// ---------------------------------------------------------------------------
// management groups CRUD
// ---------------------------------------------------------------------------

describe("betterAuthCMSAdapter – management groups CRUD", () => {
	test("listGroups returns mapped groups", async () => {
		const prisma = makePrisma({
			cmsGroup: {
				findMany: mock(async () => [
					makeGroup({ id: "g1", name: "Admins", permissions: ["cms:*"] }),
				]),
			},
		});
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const groups = await requireManagement(adapter).listGroups();

		expect(groups).toHaveLength(1);
		expect(groups[0]).toEqual({
			id: "g1",
			name: "Admins",
			permissions: ["cms:*"],
		});
	});

	test("createGroup calls cmsGroup.create with correct data", async () => {
		const createMock = mock(
			async (args: { data: { name: string; permissions: string[] } }) =>
				makeGroup({ name: args.data.name, permissions: args.data.permissions }),
		);
		const prisma = makePrisma({ cmsGroup: { create: createMock } });
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		const group = await requireManagement(adapter).createGroup({
			name: "Editors",
			permissions: ["cms:translations:write"],
		});

		expect(createMock).toHaveBeenCalledTimes(1);
		expect(group.name).toBe("Editors");
		expect(group.permissions).toContain("cms:translations:write");
	});

	test("updateGroup spreads opts excluding id into data", async () => {
		const updateMock = mock(
			async (args: { where: { id: string }; data: Partial<FakeGroup> }) =>
				makeGroup({ id: args.where.id, ...args.data }),
		);
		const prisma = makePrisma({ cmsGroup: { update: updateMock } });
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireManagement(adapter).updateGroup({ id: "g1", name: "Updated" });

		expect(updateMock).toHaveBeenCalledTimes(1);
		const args = (updateMock.mock.calls as unknown[][])[0][0] as {
			where: { id: string };
			data: { name: string };
		};
		expect(args.where.id).toBe("g1");
		expect(args.data).toEqual({ name: "Updated" });
	});

	test("deleteGroup calls cmsGroup.delete with id", async () => {
		const deleteMock = mock(async () => {});
		const prisma = makePrisma({ cmsGroup: { delete: deleteMock } });
		const adapter = betterAuthCMSAdapter({
			auth: makeAuth(),
			prisma: prisma as never,
		});

		await requireManagement(adapter).deleteGroup({ id: "g1" });

		expect(deleteMock).toHaveBeenCalledTimes(1);
		const args = (deleteMock.mock.calls as unknown[][])[0][0] as {
			where: { id: string };
		};
		expect(args.where.id).toBe("g1");
	});
});
