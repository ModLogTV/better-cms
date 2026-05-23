import { describe, expect, test } from "bun:test";
import { makeAdapter, makeApp, req } from "./helpers";

describe("admin routes", () => {
	test("GET /cms/admin/namespaces returns list of namespaces", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(req("/cms/admin/namespaces"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([{ name: "nav" }]);
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
});
