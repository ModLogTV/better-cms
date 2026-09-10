import { describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import { pagesPlugin } from "../../plugins/pages/index";
import { makeAdapter, makeApp, makePage, makeUserAuth, req } from "./helpers";

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

	test("GET /cms/pages/blocks includes preview metadata when registered", async () => {
		const withPreview = {
			type: "hero",
			schema: z.object({}),
			preview: { icon: "🦸" },
		};
		const app = makeApp(makeAdapter(), [
			pagesPlugin({ blocks: [withPreview] }),
		]);
		const res = await app.handle(req("/cms/pages/blocks"));
		const body = await res.json();
		expect(body[0].preview).toEqual({ icon: "🦸" });
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
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1" }),
		});
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
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
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1" }),
		});
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
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1" }),
		});
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
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
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1" }),
		});
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

describe("pages ACL", () => {
	test("GET /cms/pages/:path 404s for a user with neither global read nor a grant", async () => {
		const page = makePage({ nodeId: "node-1" });
		const adapter = makeAdapter({
			getPage: async () => page,
			getEffectivePagePermissions: mock(async () => []),
		});
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1" }),
		);
		const res = await app.handle(req("/cms/pages/home?locale=en"));
		expect(res.status).toBe(404);
	});

	test("GET /cms/pages/:path succeeds when the user has a node-scoped read grant", async () => {
		const page = makePage({
			nodeId: "node-1",
			blocks: [{ type: "hero", data: {} }],
		});
		const adapter = makeAdapter({
			getPage: async () => page,
			getEffectivePagePermissions: mock(async () => ["cms:pages:read"]),
		});
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1" }),
		);
		const res = await app.handle(req("/cms/pages/home?locale=en"));
		expect(res.status).toBe(200);
		expect(adapter.getEffectivePagePermissions).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "u1", nodeId: "node-1", locale: "en" }),
		);
	});

	test("PUT /cms/pages/:id returns 403 without global write or a grant", async () => {
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1", nodeId: "node-1" }),
			getEffectivePagePermissions: mock(async () => []),
		});
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1" }),
		);
		const res = await app.handle(
			req("/cms/pages/page-1", { method: "PUT", body: JSON.stringify([]) }),
		);
		expect(res.status).toBe(403);
		expect(adapter.upsertPage).not.toHaveBeenCalled();
	});

	test("PUT /cms/pages/:id succeeds with a node-scoped write grant", async () => {
		const adapter = makeAdapter({
			getPageById: async () =>
				makePage({ id: "page-1", nodeId: "node-1", locale: "en" }),
			getEffectivePagePermissions: mock(async () => ["cms:pages:write"]),
		});
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1" }),
		);
		const res = await app.handle(
			req("/cms/pages/page-1", { method: "PUT", body: JSON.stringify([]) }),
		);
		expect(res.status).toBe(200);
		expect(adapter.upsertPage).toHaveBeenCalledTimes(1);
	});

	test("GET /cms/pages/tree passes the subject through when the user lacks global read", async () => {
		const adapter = makeAdapter();
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1", groupIds: ["g1"] }),
		);
		const res = await app.handle(req("/cms/pages/tree"));
		expect(res.status).toBe(200);
		expect(adapter.listPageTree).toHaveBeenCalledWith({
			subject: { userId: "u1", groupIds: ["g1"] },
		});
	});

	test("GET /cms/pages/tree skips the subject for a user with global read", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/tree"));
		expect(res.status).toBe(200);
		expect(adapter.listPageTree).toHaveBeenCalledWith();
	});

	test("POST /cms/pages requires global write for root pages - a node grant elsewhere doesn't count", async () => {
		const adapter = makeAdapter({
			getEffectivePagePermissions: mock(async () => ["cms:pages:write"]),
		});
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1" }),
		);
		const res = await app.handle(
			req("/cms/pages", {
				method: "POST",
				body: JSON.stringify({ slug: "about", locale: "en" }),
			}),
		);
		expect(res.status).toBe(403);
		expect(adapter.createPage).not.toHaveBeenCalled();
	});

	test("POST /cms/pages/:id/grants adds a grant (requires global write)", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/node-1/grants", {
				method: "POST",
				body: JSON.stringify({
					subjectType: "group",
					subjectId: "g1",
					permission: "cms:pages:write",
				}),
			}),
		);
		expect(res.status).toBe(200);
		expect(adapter.addPageGrant).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: "node-1",
				subjectType: "group",
				subjectId: "g1",
				permission: "cms:pages:write",
			}),
		);
	});

	test("POST /cms/pages/:id/grants returns 403 for a user without global write", async () => {
		const adapter = makeAdapter();
		const app = makeApp(
			adapter,
			[pagesPlugin()],
			makeUserAuth({ userId: "u1" }),
		);
		const res = await app.handle(
			req("/cms/pages/node-1/grants", {
				method: "POST",
				body: JSON.stringify({
					subjectType: "user",
					subjectId: "u2",
					permission: "cms:pages:read",
				}),
			}),
		);
		expect(res.status).toBe(403);
	});

	test("GET /cms/pages/:id/grants lists grants for a node", async () => {
		const grant = {
			id: "grant-1",
			nodeId: "node-1",
			subjectType: "user" as const,
			subjectId: "u1",
			permission: "cms:pages:read",
			locale: null,
		};
		const adapter = makeAdapter({ listPageGrants: mock(async () => [grant]) });
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/node-1/grants"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([grant]);
	});

	test("DELETE /cms/pages/grants/:grantId removes a grant", async () => {
		const adapter = makeAdapter();
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/grants/grant-1", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(adapter.removePageGrant).toHaveBeenCalledWith({ id: "grant-1" });
	});
});
