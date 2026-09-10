import { describe, expect, mock, test } from "bun:test";
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
			listPages: async () => ({
				items: [
					{
						id: "1",
						nodeId: "node-1",
						parentId: null,
						slug: "home",
						path: "home",
						locale: "en",
						status: "published",
						updatedAt: new Date(),
					},
				],
				total: 1,
			}),
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body.items[0].slug).toBe("home");
		expect(body.total).toBe(1);
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

	test("GET /cms/pages/:path resolves a nested path, not just a single segment", async () => {
		const adapter = makeAdapter({
			getPage: mock(async ({ slug }) =>
				slug === "company/about" ? makePage({ path: "company/about" }) : null,
			),
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/company/about?locale=en"));
		expect(res.status).toBe(200);
		expect(adapter.getPage).toHaveBeenCalledWith(
			expect.objectContaining({ slug: "company/about" }),
		);
	});

	test("GET /cms/pages/tree returns the adapter's page tree", async () => {
		const adapter = makeAdapter({
			listPageTree: mock(async () => [
				{
					id: "1",
					parentId: null,
					slug: "company",
					path: "company",
					locales: [
						{
							locale: "en",
							contentId: "c1",
							status: "published" as const,
							updatedAt: new Date(),
						},
					],
					children: [],
				},
			]),
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/tree"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].slug).toBe("company");
		expect(body[0].locales[0].locale).toBe("en");
		expect(adapter.listPageTree).toHaveBeenCalledTimes(1);
	});

	test("POST /cms/pages passes parentId through to the adapter", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		await app.handle(
			req("/cms/pages", {
				method: "POST",
				body: JSON.stringify({ slug: "about", locale: "en", parentId: "p1" }),
			}),
		);
		expect(adapter.createPage).toHaveBeenCalledWith(
			expect.objectContaining({ slug: "about", locale: "en", parentId: "p1" }),
		);
	});

	test("POST /cms/pages/:nodeId/move calls adapter.movePage", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/node-1/move", {
				method: "POST",
				body: JSON.stringify({ parentId: "p2" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(adapter.movePage).toHaveBeenCalledWith({
			nodeId: "node-1",
			parentId: "p2",
		});
	});

	test("POST /cms/pages/:nodeId/move returns 409 when the adapter rejects the move", async () => {
		const adapter = makeAdapter({
			movePage: async () => {
				throw new Error("slug already exists under the destination parent");
			},
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/node-1/move", {
				method: "POST",
				body: JSON.stringify({ parentId: "p2" }),
			}),
		);
		expect(res.status).toBe(409);
	});

	test("POST /cms/pages/:nodeId/locales adds a locale to an existing node", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/node-1/locales", {
				method: "POST",
				body: JSON.stringify({ locale: "de", cloneFromLocale: "en" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(adapter.addPageLocale).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: "node-1",
				locale: "de",
				cloneFromLocale: "en",
			}),
		);
	});

	test("POST /cms/pages/:nodeId/locales returns 409 when the locale already has content", async () => {
		const adapter = makeAdapter({
			addPageLocale: async () => {
				throw new Error("unique constraint");
			},
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/node-1/locales", {
				method: "POST",
				body: JSON.stringify({ locale: "en" }),
			}),
		);
		expect(res.status).toBe(409);
	});
});
