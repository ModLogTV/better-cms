import { describe, expect, test } from "bun:test";
import { makeAdapter, makeApp, req, TOKEN } from "./helpers";

describe("translations routes", () => {
	test("GET /cms/translations/:ns/:locale returns translations", async () => {
		const adapter = makeAdapter({
			getTranslations: async () => ({ title: "Home", nav: "Menu" }),
		});
		const app = makeApp(adapter);
		const res = await app.handle(req("/cms/translations/nav/en"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ title: "Home", nav: "Menu" });
	});

	test("GET returns Cache-Control header", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(req("/cms/translations/nav/en"));
		expect(res.headers.get("Cache-Control")).toBe(
			"s-maxage=60, stale-while-revalidate=300",
		);
	});

	test("GET without token returns 401", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(
			req("/cms/translations/nav/en", { token: "wrong" }),
		);
		expect(res.status).toBe(401);
	});

	test("PUT /cms/translations/:ns/:locale upserts and returns ok", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter);
		const res = await app.handle(
			req("/cms/translations/nav/en", {
				method: "PUT",
				body: JSON.stringify({ title: "Welcome", greeting: "Hello {name}" }),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({ ok: true });
		expect(adapter.upsertTranslations).toHaveBeenCalledTimes(1);
	});

	test("PUT unknown namespace returns error", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(
			req("/cms/translations/unknown/en", {
				method: "PUT",
				body: JSON.stringify({ key: "val" }),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({ ok: false });
	});

	test("PUT emits translations:updated event", async () => {
		const adapter = makeAdapter();
		const events: unknown[] = [];
		const cms = (() => {
			const { createCMS } = require("../../core/index");
			const { defineNamespace } = require("../../i18n/namespace");
			const { key } = require("../../i18n/markers");
			const ns = defineNamespace({ name: "nav", definition: { title: key } });
			const instance = createCMS({
				database: adapter,
				namespaces: [ns],
				auth: { readToken: TOKEN, adminToken: TOKEN },
			});
			instance.events.on("translations:updated", (e: unknown) =>
				events.push(e),
			);
			return instance;
		})();
		const { Elysia } = require("elysia");
		const { toElysiaPlugin } = require("../index");
		const app = new Elysia().use(toElysiaPlugin(cms));
		await app.handle(
			req("/cms/translations/nav/en", {
				method: "PUT",
				body: JSON.stringify({ title: "Hi" }),
			}),
		);
		expect(events).toHaveLength(1);
	});
});
