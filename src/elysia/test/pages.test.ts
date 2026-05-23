import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { pagesPlugin } from "../../plugins/pages/index";
import { makeAdapter, makeApp, makePage, req } from "./helpers";

const heroBlock = { type: "hero", schema: z.object({ title: z.string() }) };

describe("pages routes", () => {
	test("GET /cms/pages returns list of pages", async () => {
		const adapter = makeAdapter({
			listPages: async () => [
				{
					id: "1",
					slug: "home",
					locale: "en",
					status: "published",
					updatedAt: new Date(),
				},
			],
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].slug).toBe("home");
	});

	test("GET /cms/pages without token returns 401", async () => {
		const app = makeApp(makeAdapter(), [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages", { token: "wrong" }));
		expect(res.status).toBe(401);
	});

	test("GET /cms/pages/:slug returns 404 when page not found", async () => {
		const app = makeApp(makeAdapter(), [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(req("/cms/pages/home?locale=en"));
		expect(res.status).toBe(404);
	});

	test("GET /cms/pages/:slug returns blocks when found", async () => {
		const page = makePage({
			blocks: [{ type: "hero", data: { title: "Hello" } }],
		});
		const adapter = makeAdapter({ getPage: async () => page });
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(req("/cms/pages/home?locale=en"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([{ type: "hero", data: { title: "Hello" } }]);
	});

	test("GET returns Cache-Control header", async () => {
		const page = makePage({ blocks: [] });
		const adapter = makeAdapter({ getPage: async () => page });
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/home?locale=en"));
		expect(res.headers.get("Cache-Control")).toBe(
			"s-maxage=60, stale-while-revalidate=300",
		);
	});

	test("PUT /cms/pages/:id validates block schema", async () => {
		const app = makeApp(makeAdapter(), [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(
			req("/cms/pages/page-1", {
				method: "PUT",
				body: JSON.stringify([{ type: "hero", data: { title: 123 } }]),
			}),
		);
		const body = await res.json();
		expect(body).toMatchObject({ ok: false });
	});

	test("PUT /cms/pages/:id accepts valid blocks", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(
			req("/cms/pages/page-1", {
				method: "PUT",
				body: JSON.stringify([{ type: "hero", data: { title: "Welcome" } }]),
			}),
		);
		const body = await res.json();
		expect(body).toMatchObject({ ok: true });
		expect(adapter.upsertPage).toHaveBeenCalledTimes(1);
	});

	test("PUT unknown block type returns error", async () => {
		const app = makeApp(makeAdapter(), [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(
			req("/cms/pages/page-1", {
				method: "PUT",
				body: JSON.stringify([{ type: "unknown", data: {} }]),
			}),
		);
		const body = await res.json();
		expect(body).toMatchObject({ ok: false });
	});

	test("POST /cms/pages/:id/publish calls publishPage", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/page-1/publish", { method: "POST" }),
		);
		expect(res.status).toBe(200);
		expect(adapter.publishPage).toHaveBeenCalledWith("page-1");
	});

	test("GET ?draft=true passes draft=true to adapter", async () => {
		const adapter = makeAdapter({
			getPage: async (_slug, _locale, draft) => {
				return draft ? makePage({ status: "draft" }) : null;
			},
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/home?locale=en&draft=true"));
		expect(res.status).toBe(200);
	});
});
