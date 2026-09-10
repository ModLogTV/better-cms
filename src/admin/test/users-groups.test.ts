import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createAdminClient } from "../index";

const CMS_URL = "http://cms.test";
const TOKEN = "admin-token";
const admin = createAdminClient({ cmsUrl: CMS_URL, token: TOKEN });

function mockFetch(handler: (url: string, init: RequestInit) => Response) {
	return spyOn(globalThis, "fetch").mockImplementation(((
		url: unknown,
		init: unknown,
	) =>
		Promise.resolve(
			handler(url as string, init as RequestInit),
		)) as typeof fetch);
}

function jsonOk(body: unknown) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

afterEach(() => {
	(globalThis.fetch as ReturnType<typeof spyOn>).mockRestore?.();
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe("admin.users.list", () => {
	test("GET /cms/admin/users", async () => {
		const users = [
			{
				id: "u1",
				email: "a@b.com",
				name: "Alice",
				permissions: [],
				groupIds: [],
			},
		];
		const paginated = { items: users, total: 1 };
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/users?page=1&pageSize=20`);
			expect(init.method).toBeUndefined();
			return jsonOk(paginated);
		});
		const result = await admin.users.list({ page: 1, pageSize: 20 });
		expect(result).toEqual(paginated);
		spy.mockRestore();
	});
});

describe("admin.users.getPermissions", () => {
	test("GET /cms/admin/users/:userId/permissions", async () => {
		const spy = mockFetch((url) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/users/u1/permissions`);
			return jsonOk(["cms:translations:read"]);
		});
		const result = await admin.users.getPermissions({ userId: "u1" });
		expect(result).toContain("cms:translations:read");
		spy.mockRestore();
	});
});

describe("admin.users.setPermissions", () => {
	test("PUT /cms/admin/users/:userId/permissions with body", async () => {
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/users/u1/permissions`);
			expect(init.method).toBe("PUT");
			const body = JSON.parse(init.body as string);
			expect(body).toEqual({ permissions: ["cms:pages:write"] });
			return jsonOk({ ok: true });
		});
		await admin.users.setPermissions({
			userId: "u1",
			permissions: ["cms:pages:write"],
		});
		spy.mockRestore();
	});
});

describe("admin.users.getGroups", () => {
	test("GET /cms/admin/users/:userId/groups", async () => {
		const groups = [{ id: "g1", name: "Editors", permissions: [] }];
		const spy = mockFetch((url) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/users/u1/groups`);
			return jsonOk(groups);
		});
		const result = await admin.users.getGroups({ userId: "u1" });
		expect(result).toEqual(groups);
		spy.mockRestore();
	});
});

describe("admin.users.addToGroup", () => {
	test("POST /cms/admin/users/:userId/groups with groupId in body", async () => {
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/users/u1/groups`);
			expect(init.method).toBe("POST");
			const body = JSON.parse(init.body as string);
			expect(body).toEqual({ groupId: "g1" });
			return jsonOk({ ok: true });
		});
		await admin.users.addToGroup({ userId: "u1", groupId: "g1" });
		spy.mockRestore();
	});
});

describe("admin.users.removeFromGroup", () => {
	test("DELETE /cms/admin/users/:userId/groups/:groupId", async () => {
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/users/u1/groups/g1`);
			expect(init.method).toBe("DELETE");
			return jsonOk({ ok: true });
		});
		await admin.users.removeFromGroup({ userId: "u1", groupId: "g1" });
		spy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

describe("admin.groups.list", () => {
	test("GET /cms/admin/groups", async () => {
		const groups = [
			{ id: "g1", name: "Editors", permissions: ["cms:translations:write"] },
		];
		const spy = mockFetch((url) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/groups`);
			return jsonOk(groups);
		});
		const result = await admin.groups.list();
		expect(result).toEqual(groups);
		spy.mockRestore();
	});
});

describe("admin.groups.create", () => {
	test("POST /cms/admin/groups with name and permissions", async () => {
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/groups`);
			expect(init.method).toBe("POST");
			const body = JSON.parse(init.body as string);
			expect(body.name).toBe("Writers");
			expect(body.permissions).toContain("cms:translations:write");
			return jsonOk({
				id: "g-new",
				name: "Writers",
				permissions: body.permissions,
			});
		});
		const result = await admin.groups.create({
			name: "Writers",
			permissions: ["cms:translations:write"],
		});
		expect(result.name).toBe("Writers");
		spy.mockRestore();
	});
});

describe("admin.groups.update", () => {
	test("PUT /cms/admin/groups/:id with partial fields", async () => {
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/groups/g1`);
			expect(init.method).toBe("PUT");
			const body = JSON.parse(init.body as string);
			expect(body.name).toBe("Senior Editors");
			expect(body.id).toBeUndefined(); // id must not be in body
			return jsonOk({ id: "g1", name: "Senior Editors", permissions: [] });
		});
		const result = await admin.groups.update({
			id: "g1",
			name: "Senior Editors",
		});
		expect(result.name).toBe("Senior Editors");
		spy.mockRestore();
	});

	test("PUT /cms/admin/groups/:id with permissions only", async () => {
		const spy = mockFetch((_url, init) => {
			const body = JSON.parse(init.body as string);
			expect(body.permissions).toContain("cms:pages:publish");
			expect(body.name).toBeUndefined();
			return jsonOk({ id: "g1", name: "G", permissions: body.permissions });
		});
		await admin.groups.update({ id: "g1", permissions: ["cms:pages:publish"] });
		spy.mockRestore();
	});
});

describe("admin.groups.delete", () => {
	test("DELETE /cms/admin/groups/:id", async () => {
		const spy = mockFetch((url, init) => {
			expect(url).toBe(`${CMS_URL}/cms/admin/groups/g1`);
			expect(init.method).toBe("DELETE");
			return jsonOk({ ok: true });
		});
		await admin.groups.delete({ id: "g1" });
		spy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Auth header
// ---------------------------------------------------------------------------

describe("admin client - auth header", () => {
	test("sends x-internal-token on all requests", async () => {
		const spy = mockFetch((_, init) => {
			const headers = init.headers as Record<string, string>;
			expect(headers["x-internal-token"]).toBe(TOKEN);
			return jsonOk({ items: [], total: 0 });
		});
		await admin.users.list({ page: 1, pageSize: 20 });
		spy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("admin client - error handling", () => {
	test("throws CMSError on 403 response", async () => {
		const spy = mockFetch(() => new Response("Forbidden", { status: 403 }));
		const { CMSError } = await import("../index");
		await expect(
			admin.users.list({ page: 1, pageSize: 20 }),
		).rejects.toBeInstanceOf(CMSError);
		spy.mockRestore();
	});

	test("CMSError has correct status code", async () => {
		const spy = mockFetch(() => new Response("Not Found", { status: 404 }));
		const { CMSError } = await import("../index");
		try {
			await admin.groups.list();
			expect(true).toBe(false); // should not reach
		} catch (err) {
			expect(err).toBeInstanceOf(CMSError);
			expect((err as InstanceType<typeof CMSError>).status).toBe(404);
		}
		spy.mockRestore();
	});
});
