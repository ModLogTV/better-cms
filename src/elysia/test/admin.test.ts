import { describe, expect, test } from "bun:test";
import { makeAdapter, makeApp, req } from "./helpers";

describe("admin routes", () => {
	test("GET /cms/admin/namespaces returns list of namespaces with stats", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(req("/cms/admin/namespaces"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([
			{ name: "nav", keyCount: 2, updatedAt: null, coverage: {} },
		]);
	});

	test("GET /cms/admin/namespaces computes coverage from stored key counts", async () => {
		const app = makeApp(
			makeAdapter({
				listNamespaceLocaleMeta: async () => [
					{ locale: "en", updatedAt: new Date("2024-01-01"), keyCount: 2 },
					{ locale: "de", updatedAt: new Date("2024-01-02"), keyCount: 1 },
				],
			}),
		);
		const res = await app.handle(req("/cms/admin/namespaces"));
		const body = await res.json();
		expect(body).toEqual([
			{
				name: "nav",
				keyCount: 2,
				updatedAt: "2024-01-02T00:00:00.000Z",
				coverage: { en: 100, de: 50 },
			},
		]);
	});

	test("GET /cms/admin/permissions returns the permission catalog with the wildcard", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(req("/cms/admin/permissions"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Array.isArray(body)).toBe(true);
		expect(body.at(-1)).toEqual({
			value: "cms:*",
			description: "Grants every CMS permission",
		});
		expect(body.length).toBe(17);
	});

	test("GET /cms/admin/namespaces/:ns/describe returns key metadata", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(req("/cms/admin/namespaces/nav/describe"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([
			{ key: "title", type: "key", inputHint: "text" },
			{
				key: "greeting",
				type: "vars",
				inputHint: "text+vars",
				vars: [],
			},
		]);
	});

	test("GET /cms/admin/namespaces/:ns/describe returns 404 for unknown ns", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(req("/cms/admin/namespaces/unknown/describe"));
		expect(res.status).toBe(404);
	});

	test("GET /cms/admin/namespaces without token returns 401", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(
			req("/cms/admin/namespaces", { token: "wrong" }),
		);
		expect(res.status).toBe(401);
	});

	test("GET /cms/admin/audit-log returns the paginated audit trail", async () => {
		const entry = {
			id: "a1",
			actorId: "u1",
			action: "group.created",
			targetType: "group",
			targetId: "g1",
			detail: {},
			createdAt: new Date("2024-01-01"),
		};
		const app = makeApp(
			makeAdapter({
				listAuditLog: async () => ({ items: [entry], total: 1 }),
			}),
		);
		const res = await app.handle(req("/cms/admin/audit-log"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.total).toBe(1);
		expect(body.items[0].action).toBe("group.created");
	});

	test("GET /cms/admin/audit-log without token returns 401", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(
			req("/cms/admin/audit-log", { token: "wrong" }),
		);
		expect(res.status).toBe(401);
	});
});
