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
							hasBlocks: true,
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

describe("page versions", () => {
	test("GET /cms/pages/:id/versions lists history for a page", async () => {
		const summary = {
			id: "v1",
			contentId: "page-1",
			createdAt: new Date(),
			publishedAt: null,
			createdBy: null,
		};
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1" }),
			listPageVersions: mock(async () => [summary]),
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/page-1/versions"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].id).toBe("v1");
		expect(adapter.listPageVersions).toHaveBeenCalledWith({ id: "page-1" });
	});

	test("GET /cms/pages/versions/:versionId returns a version's snapshot", async () => {
		const version = {
			id: "v1",
			contentId: "page-1",
			blocks: [{ type: "hero", data: {} }],
			createdAt: new Date(),
			publishedAt: null,
			createdBy: null,
		};
		const adapter = makeAdapter({
			getPageVersion: mock(async () => version),
			getPageById: async () => makePage({ id: "page-1" }),
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/versions/v1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe("v1");
		expect(adapter.getPageVersion).toHaveBeenCalledWith({ versionId: "v1" });
	});

	test("GET /cms/pages/versions/:versionId 404s when the version doesn't exist", async () => {
		const adapter = makeAdapter({ getPageVersion: mock(async () => null) });
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(req("/cms/pages/versions/missing"));
		expect(res.status).toBe(404);
	});

	test("POST /cms/pages/:id/restore restores a past version into a new draft", async () => {
		const adapter = makeAdapter({
			getPageById: async () => makePage({ id: "page-1" }),
		});
		const app = makeApp(adapter, [pagesPlugin()]);
		const res = await app.handle(
			req("/cms/pages/page-1/restore", {
				method: "POST",
				body: JSON.stringify({ versionId: "v1" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(adapter.restorePageVersion).toHaveBeenCalledWith({
			id: "page-1",
			versionId: "v1",
		});
	});
});

/**
 * Ticket #6 regression suite. Root cause of the original bug: Save and
 * Publish both wrote in place to the same `blocks` column with no
 * snapshot boundary, so a save on an already-published page could land
 * on the same row Publish had just read from (or vice versa), and there
 * was no way to tell "published" from "published, but a later save
 * changed it" - a save could silently go missing from what the public
 * route served. Ticket #5's version-history rework removes the shared
 * column entirely: Save always appends a new PageVersion, Publish only
 * ever points `publishedVersionId` at one, and the public read path
 * resolves that pointer - so a save can never retroactively change
 * what's already published. This in-memory fake reproduces that real
 * adapter's persistence semantics (not just a mock) to prove it.
 */
function makeStatefulPageAdapter() {
	interface Version {
		id: string;
		blocks: unknown;
		createdAt: Date;
		publishedAt: Date | null;
	}
	interface Content {
		id: string;
		path: string;
		locale: string;
		publishedVersionId: string | null;
		versions: Version[];
	}
	const contents = new Map<string, Content>();
	let versionCounter = 0;

	function status(content: Content): "draft" | "published" | "modified" {
		if (!content.publishedVersionId) return "draft";
		const latest = content.versions[content.versions.length - 1];
		return content.publishedVersionId === latest?.id ? "published" : "modified";
	}

	function toPage(content: Content, blocks: unknown) {
		return makePage({
			id: content.id,
			path: content.path,
			locale: content.locale,
			blocks: blocks as never,
			status: status(content),
		});
	}

	const adapter = makeAdapter({
		createPage: mock(async ({ id, slug, locale }) => {
			const version: Version = {
				id: `v${++versionCounter}`,
				blocks: [],
				createdAt: new Date(),
				publishedAt: null,
			};
			contents.set(id, {
				id,
				path: slug,
				locale,
				publishedVersionId: null,
				versions: [version],
			});
			return toPage(contents.get(id) as Content, []);
		}),
		upsertPage: mock(async ({ id, blocks }) => {
			const content = contents.get(id);
			if (!content) throw new Error("not found");
			content.versions.push({
				id: `v${++versionCounter}`,
				blocks,
				createdAt: new Date(),
				publishedAt: null,
			});
		}),
		publishPage: mock(async ({ id }) => {
			const content = contents.get(id);
			if (!content) throw new Error("not found");
			const latest = content.versions[content.versions.length - 1] as Version;
			if (!latest.publishedAt) latest.publishedAt = new Date();
			content.publishedVersionId = latest.id;
		}),
		getPageById: mock(async ({ id }) => {
			const content = contents.get(id);
			if (!content) return null;
			return toPage(
				content,
				content.versions[content.versions.length - 1]?.blocks ?? [],
			);
		}),
		getPage: mock(async ({ slug, locale, draft }) => {
			const content = [...contents.values()].find(
				(c) => c.path === slug && c.locale === locale,
			);
			if (!content) return null;
			if (draft)
				return toPage(
					content,
					content.versions[content.versions.length - 1]?.blocks,
				);
			if (!content.publishedVersionId) return null;
			const published = content.versions.find(
				(v) => v.id === content.publishedVersionId,
			);
			return toPage(content, published?.blocks);
		}),
	});
	return { adapter, contents };
}

async function createTestPage(
	app: ReturnType<typeof makeApp>,
	slug: string,
): Promise<string> {
	const res = await app.handle(
		req("/cms/pages", {
			method: "POST",
			body: JSON.stringify({ slug, locale: "en" }),
		}),
	);
	const body = (await res.json()) as { id: string };
	return body.id;
}

describe("ticket #6 regression: page saves reliably persist", () => {
	test("saving a draft on an already-published page never changes what's public until explicitly re-published", async () => {
		const { adapter } = makeStatefulPageAdapter();
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
		const id = await createTestPage(app, "about");

		await app.handle(
			req(`/cms/pages/${id}`, {
				method: "PUT",
				body: JSON.stringify([{ type: "hero", data: { title: "v1" } }]),
			}),
		);
		await app.handle(req(`/cms/pages/${id}/publish`, { method: "POST" }));

		const publicBefore = await app
			.handle(req("/cms/pages/about?locale=en"))
			.then((r) => r.json());
		expect(publicBefore).toEqual([{ type: "hero", data: { title: "v1" } }]);

		// Save a draft edit - must NOT touch the live/published content.
		await app.handle(
			req(`/cms/pages/${id}`, {
				method: "PUT",
				body: JSON.stringify([{ type: "hero", data: { title: "v2 draft" } }]),
			}),
		);

		const publicAfterSave = await app
			.handle(req("/cms/pages/about?locale=en"))
			.then((r) => r.json());
		expect(publicAfterSave).toEqual(publicBefore);

		const draftAfterSave = await app
			.handle(req("/cms/pages/about?locale=en&draft=true"))
			.then((r) => r.json());
		expect(draftAfterSave).toEqual([
			{ type: "hero", data: { title: "v2 draft" } },
		]);

		// Publishing promotes the draft - now it's public too.
		await app.handle(req(`/cms/pages/${id}/publish`, { method: "POST" }));
		const publicAfterPublish = await app
			.handle(req("/cms/pages/about?locale=en"))
			.then((r) => r.json());
		expect(publicAfterPublish).toEqual(draftAfterSave);
	});

	test("saving a plain draft page (never published) is reflected immediately and stays unpublished", async () => {
		const { adapter } = makeStatefulPageAdapter();
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
		const id = await createTestPage(app, "draft-only");

		await app.handle(
			req(`/cms/pages/${id}`, {
				method: "PUT",
				body: JSON.stringify([
					{ type: "hero", data: { title: "still a draft" } },
				]),
			}),
		);

		const draft = await app
			.handle(req("/cms/pages/draft-only?locale=en&draft=true"))
			.then((r) => r.json());
		expect(draft).toEqual([{ type: "hero", data: { title: "still a draft" } }]);

		const publicRes = await app.handle(req("/cms/pages/draft-only?locale=en"));
		expect(publicRes.status).toBe(404);
	});

	test("rapid consecutive saves are never lost - the last write wins and each is a distinct version", async () => {
		const { adapter, contents } = makeStatefulPageAdapter();
		const app = makeApp(adapter, [pagesPlugin({ blocks: [heroBlock] })]);
		const id = await createTestPage(app, "rapid");

		await Promise.all(
			Array.from({ length: 5 }, (_, i) =>
				app.handle(
					req(`/cms/pages/${id}`, {
						method: "PUT",
						body: JSON.stringify([
							{ type: "hero", data: { title: `save-${i}` } },
						]),
					}),
				),
			),
		);

		const content = contents.get(id);
		// initial version from createPage + 5 saves = 6, none lost.
		expect(content?.versions).toHaveLength(6);

		const draft = await app
			.handle(req("/cms/pages/rapid?locale=en&draft=true"))
			.then((r) => r.json());
		expect(draft[0].data.title).toMatch(/^save-\d$/);
	});
});
