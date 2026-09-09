import { describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import type {
	CMSAuthManagement,
	CMSGroup,
	CMSUserSummary,
} from "../../auth/adapter";
import { tokenAuthAdapter } from "../../auth/token-adapter";
import { createCMS } from "../../core/index";
import { toElysiaPlugin } from "../index";
import { makeAdapter, ns, req } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_TOKEN = "admin-token";

function makeManagement(
	overrides: Partial<CMSAuthManagement> = {},
): CMSAuthManagement {
	const group: CMSGroup = {
		id: "g1",
		name: "Editors",
		permissions: ["cms:translations:write"],
	};
	const user: CMSUserSummary = {
		id: "u1",
		email: "alice@example.com",
		name: "Alice",
		permissions: [],
		groupIds: ["g1"],
	};
	return {
		listUsers: mock(async () => [user]),
		getUserPermissions: mock(async () => ["cms:translations:read"]),
		setUserPermissions: mock(async () => {}),
		getUserGroups: mock(async () => [group]),
		addUserToGroup: mock(async () => {}),
		removeUserFromGroup: mock(async () => {}),
		listGroups: mock(async () => [group]),
		createGroup: mock(async ({ name, permissions }) => ({
			id: "g-new",
			name,
			permissions,
		})),
		updateGroup: mock(async ({ id, ...rest }) => ({
			id,
			name: rest.name ?? "G",
			permissions: rest.permissions ?? [],
		})),
		deleteGroup: mock(async () => {}),
		...overrides,
	};
}

function makeAppWithManagement(management: CMSAuthManagement) {
	const cms = createCMS({
		database: makeAdapter(),
		namespaces: [ns],
		auth: {
			...tokenAuthAdapter({ readToken: "read", adminToken: ADMIN_TOKEN }),
			management,
		},
	});
	return new Elysia().use(toElysiaPlugin(cms));
}

function makeAppWithoutManagement() {
	const cms = createCMS({
		database: makeAdapter(),
		namespaces: [ns],
		auth: tokenAuthAdapter({ readToken: "read", adminToken: ADMIN_TOKEN }),
	});
	return new Elysia().use(toElysiaPlugin(cms));
}

const adminReq = (path: string, init?: RequestInit) =>
	req(path, { ...init, token: ADMIN_TOKEN });

// ---------------------------------------------------------------------------
// No management → routes not registered
// ---------------------------------------------------------------------------

describe("user routes – no management adapter", () => {
	test("GET /cms/admin/users returns 404 when management not set", async () => {
		const app = makeAppWithoutManagement();
		const res = await app.handle(adminReq("/cms/admin/users"));
		expect(res.status).toBe(404);
	});

	test("GET /cms/admin/groups returns 404 when management not set", async () => {
		const app = makeAppWithoutManagement();
		const res = await app.handle(adminReq("/cms/admin/groups"));
		expect(res.status).toBe(404);
	});
});

// ---------------------------------------------------------------------------
// Auth enforcement
// ---------------------------------------------------------------------------

describe("user routes – auth enforcement", () => {
	test("GET /cms/admin/users returns 401 without token", async () => {
		const app = makeAppWithManagement(makeManagement());
		const res = await app.handle(req("/cms/admin/users", { token: "bad" }));
		expect(res.status).toBe(401);
	});

	test("GET /cms/admin/groups returns 401 without token", async () => {
		const app = makeAppWithManagement(makeManagement());
		const res = await app.handle(req("/cms/admin/groups", { token: "bad" }));
		expect(res.status).toBe(401);
	});
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe("GET /cms/admin/users", () => {
	test("returns user list", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(adminReq("/cms/admin/users"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].email).toBe("alice@example.com");
		expect(mgmt.listUsers).toHaveBeenCalledTimes(1);
	});
});

describe("GET /cms/admin/users/:userId/permissions", () => {
	test("returns permissions array", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(adminReq("/cms/admin/users/u1/permissions"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toContain("cms:translations:read");
		expect(mgmt.getUserPermissions).toHaveBeenCalledTimes(1);
	});
});

describe("PUT /cms/admin/users/:userId/permissions", () => {
	test("calls setUserPermissions and returns ok", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(
			adminReq("/cms/admin/users/u1/permissions", {
				method: "PUT",
				body: JSON.stringify({ permissions: ["cms:translations:write"] }),
			}),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
		expect(mgmt.setUserPermissions).toHaveBeenCalledTimes(1);
		const call = (mgmt.setUserPermissions as ReturnType<typeof mock>).mock
			.calls[0][0] as { userId: string; permissions: string[] };
		expect(call.userId).toBe("u1");
		expect(call.permissions).toContain("cms:translations:write");
	});
});

describe("GET /cms/admin/users/:userId/groups", () => {
	test("returns group list for user", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(adminReq("/cms/admin/users/u1/groups"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("Editors");
	});
});

describe("POST /cms/admin/users/:userId/groups", () => {
	test("calls addUserToGroup and returns ok", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(
			adminReq("/cms/admin/users/u1/groups", {
				method: "POST",
				body: JSON.stringify({ groupId: "g1" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
		const call = (mgmt.addUserToGroup as ReturnType<typeof mock>).mock
			.calls[0][0] as { userId: string; groupId: string };
		expect(call).toEqual({ userId: "u1", groupId: "g1" });
	});
});

describe("DELETE /cms/admin/users/:userId/groups/:groupId", () => {
	test("calls removeUserFromGroup and returns ok", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(
			adminReq("/cms/admin/users/u1/groups/g1", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
		const call = (mgmt.removeUserFromGroup as ReturnType<typeof mock>).mock
			.calls[0][0] as { userId: string; groupId: string };
		expect(call).toEqual({ userId: "u1", groupId: "g1" });
	});
});

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

describe("GET /cms/admin/groups", () => {
	test("returns group list", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(adminReq("/cms/admin/groups"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("Editors");
	});
});

describe("POST /cms/admin/groups", () => {
	test("creates group and returns it", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(
			adminReq("/cms/admin/groups", {
				method: "POST",
				body: JSON.stringify({
					name: "Writers",
					permissions: ["cms:translations:write"],
				}),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.name).toBe("Writers");
		expect(mgmt.createGroup).toHaveBeenCalledTimes(1);
	});
});

describe("PUT /cms/admin/groups/:groupId", () => {
	test("updates group and returns it", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(
			adminReq("/cms/admin/groups/g1", {
				method: "PUT",
				body: JSON.stringify({ name: "Senior Editors" }),
			}),
		);
		expect(res.status).toBe(200);
		const call = (mgmt.updateGroup as ReturnType<typeof mock>).mock
			.calls[0][0] as { id: string; name?: string };
		expect(call.id).toBe("g1");
		expect(call.name).toBe("Senior Editors");
	});
});

describe("DELETE /cms/admin/groups/:groupId", () => {
	test("deletes group and returns ok", async () => {
		const mgmt = makeManagement();
		const app = makeAppWithManagement(mgmt);
		const res = await app.handle(
			adminReq("/cms/admin/groups/g1", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
		const call = (mgmt.deleteGroup as ReturnType<typeof mock>).mock
			.calls[0][0] as { id: string };
		expect(call.id).toBe("g1");
	});
});
