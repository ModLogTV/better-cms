import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { pagesPlugin } from "../../plugins/pages/index";
import { makeAdapter, makeApp, makePage, req } from "./helpers";

const heroBlock = {
	type: "hero",
	label: "Hero",
	schema: z.object({ title: z.string() }),
	fields: [{ key: "title", label: "Title", type: "text" as const }],
};

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

	test("GET /cms/pages/blocks returns registered block catalog, not treated as a slug", async () => {
		const app = makeApp(makeAdapter(), [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(req("/cms/pages/blocks"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([
			{
				type: "hero",
				label: "Hero",
				fields: [{ key: "title", label: "Title", type: "text" }],
			},
		]);
	});

	test("GET /cms/pages/blocks falls back to type as label and empty fields", async () => {
		const bare = { type: "spacer", schema: z.object({}) };
		const app = makeApp(makeAdapter(), [pagesPlugin({ blocks: [bare] })]);
		const res = await app.handle(req("/cms/pages/blocks"));
		const body = await res.json();
		expect(body).toEqual([{ type: "spacer", label: "spacer", fields: [] }]);
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

	test("POST /cms/pages creates a page for the given slug and locale", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
		const res = await app.handle(
			req("/cms/pages", {
				method: "POST",
				body: JSON.stringify({ slug: "about", locale: "de" }),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({ slug: "about", locale: "de" });
		expect(adapter.createPage).toHaveBeenCalledWith(
			expect.objectContaining({ slug: "about", locale: "de" }),
		);
	});

	test("POST /cms/pages returns 409 when the adapter rejects a duplicate slug/locale", async () => {
		const adapter = makeAdapter({
			createPage: async () => {
				throw new Error("unique constraint");
			},
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages", {
				method: "POST",
				body: JSON.stringify({ slug: "home", locale: "en" }),
			}),
		);
		expect(res.status).toBe(409);
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
		expect(adapter.publishPage).toHaveBeenCalledWith({ id: "page-1" });
	});

	test("GET ?draft=true passes draft=true to adapter", async () => {
		const adapter = makeAdapter({
			getPage: async ({ draft }) => {
				return draft ? makePage({ status: "draft" }) : null;
			},
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/home?locale=en&draft=true"));
		expect(res.status).toBe(200);
	});
});
