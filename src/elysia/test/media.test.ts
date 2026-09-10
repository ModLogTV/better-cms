import { describe, expect, mock, test } from "bun:test";
import type { CMSStorageAdapter } from "../../core/storage";
import { mediaPlugin } from "../../plugins/media/index";
import {
	makeAdapter,
	makeApp,
	makeMediaAsset,
	makeUserAuth,
	req,
} from "./helpers";

function makeStorage(
	overrides: Partial<CMSStorageAdapter> = {},
): CMSStorageAdapter {
	return {
		presign: async ({ key }) => ({
			uploadUrl: `https://s3.example.com/${key}?sig=abc`,
			publicUrl: `https://cdn.example.com/${key}`,
		}),
		delete: async () => {},
		...overrides,
	};
}

describe("media routes - presign", () => {
	test("POST /cms/media/presign returns uploadUrl, publicUrl, and assetId", async () => {
		const storage = makeStorage();
		const app = makeApp(makeAdapter(), [
			mediaPlugin({ storage, cdnUrl: "https://cdn.example.com" }),
		]);
		const res = await app.handle(
			req("/cms/media/presign", {
				method: "POST",
				body: JSON.stringify({
					filename: "photo.jpg",
					mimeType: "image/jpeg",
					size: 12345,
				}),
			}),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			uploadUrl: string;
			publicUrl: string;
			assetId: string;
		};
		expect(body.uploadUrl).toMatch(/^https:\/\/s3\.example\.com\//);
		expect(body.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\//);
		expect(typeof body.assetId).toBe("string");
	});

	test("publicUrl contains the filename", async () => {
		const app = makeApp(makeAdapter(), [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/presign", {
				method: "POST",
				body: JSON.stringify({
					filename: "banner.png",
					mimeType: "image/png",
					size: 9999,
				}),
			}),
		);
		const body = (await res.json()) as { publicUrl: string };
		expect(body.publicUrl).toMatch(/banner\.png/);
	});

	test("presign records asset via adapter.createMediaAsset", async () => {
		const createMediaAsset = mock(
			async (opts: {
				id: string;
				key: string;
				filename: string;
				mimeType: string;
				size: number;
				publicUrl: string;
				uploadedBy?: string;
			}) => makeMediaAsset({ id: "new-id", key: opts.key }),
		);
		const adapter = makeAdapter({ createMediaAsset });
		const app = makeApp(adapter, [makePlugin()]);
		await app.handle(
			req("/cms/media/presign", {
				method: "POST",
				body: JSON.stringify({
					filename: "img.jpg",
					mimeType: "image/jpeg",
					size: 1,
				}),
			}),
		);
		expect(createMediaAsset).toHaveBeenCalledTimes(1);
	});

	test("presign without storage returns 404", async () => {
		const app = makeApp(makeAdapter());
		const res = await app.handle(
			req("/cms/media/presign", {
				method: "POST",
				body: JSON.stringify({
					filename: "x.jpg",
					mimeType: "image/jpeg",
					size: 1,
				}),
			}),
		);
		expect(res.status).toBe(404);
	});

	test("POST without valid token returns 401", async () => {
		const app = makeApp(makeAdapter(), [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/presign", {
				method: "POST",
				token: "bad",
				body: JSON.stringify({
					filename: "x.jpg",
					mimeType: "image/jpeg",
					size: 1,
				}),
			}),
		);
		expect(res.status).toBe(401);
	});
});

describe("media routes - confirm", () => {
	test("POST /cms/media/:assetId/confirm calls confirmMediaAsset", async () => {
		const confirmMediaAsset = mock(async () => {});
		const adapter = makeAdapter({ confirmMediaAsset });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/asset-42/confirm", { method: "POST" }),
		);
		expect(res.status).toBe(204);
		expect(confirmMediaAsset).toHaveBeenCalledTimes(1);
		const args = (confirmMediaAsset.mock.calls as unknown[][])[0][0] as {
			id: string;
		};
		expect(args.id).toBe("asset-42");
	});
});

describe("media routes - list", () => {
	test("GET /cms/media returns asset list", async () => {
		const assets = [makeMediaAsset({ id: "a1", filename: "hero.jpg" })];
		const adapter = makeAdapter({ listMediaAssets: mock(async () => assets) });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as typeof assets;
		expect(body).toHaveLength(1);
		expect(body[0].filename).toBe("hero.jpg");
	});

	test("GET /cms/media without token returns 401", async () => {
		const app = makeApp(makeAdapter(), [makePlugin()]);
		const res = await app.handle(req("/cms/media", { token: "bad" }));
		expect(res.status).toBe(401);
	});
});

describe("media routes - read URL", () => {
	test("GET /cms/media/:key/url returns publicUrl when presignRead absent", async () => {
		const asset = makeMediaAsset({
			key: "my-file.jpg",
			publicUrl: "https://cdn.example.com/my-file.jpg",
		});
		const adapter = makeAdapter({ listMediaAssets: mock(async () => [asset]) });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/my-file.jpg/url"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { url: string };
		expect(body.url).toBe("https://cdn.example.com/my-file.jpg");
	});

	test("GET /cms/media/:key/url uses presignRead when available", async () => {
		const asset = makeMediaAsset({
			key: "private.jpg",
			publicUrl: "https://cdn.example.com/private.jpg",
		});
		const adapter = makeAdapter({ listMediaAssets: mock(async () => [asset]) });
		const storage = makeStorage({
			presignRead: async ({ key }) => ({
				url: `https://s3.example.com/${key}?signed=true`,
			}),
		});
		const app = makeApp(adapter, [mediaPlugin({ storage })]);
		const res = await app.handle(req("/cms/media/private.jpg/url"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { url: string };
		expect(body.url).toContain("signed=true");
	});

	test("GET /cms/media/:key/url returns 404 for unknown key", async () => {
		const adapter = makeAdapter({ listMediaAssets: mock(async () => []) });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/missing.jpg/url"));
		expect(res.status).toBe(404);
	});
});

describe("media routes - delete", () => {
	test("DELETE /cms/media/:key calls storage.delete and adapter.deleteMediaAsset", async () => {
		let deletedKey = "";
		const deleteMediaAsset = mock(async () => {});
		const adapter = makeAdapter({
			deleteMediaAsset,
			listMediaAssets: mock(async () => [
				makeMediaAsset({ key: "my-file.png" }),
			]),
		});
		const storage = makeStorage({
			delete: async ({ key }) => {
				deletedKey = key;
			},
		});
		const app = makeApp(adapter, [mediaPlugin({ storage })]);
		const res = await app.handle(
			req("/cms/media/my-file.png", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(deletedKey).toBe("my-file.png");
		expect(deleteMediaAsset).toHaveBeenCalledTimes(1);
	});
});

describe("media routes - publish/versions/restore", () => {
	test("POST /cms/media/:id/publish calls publishMediaAsset", async () => {
		const publishMediaAsset = mock(async () => {});
		const adapter = makeAdapter({
			publishMediaAsset,
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/asset-1/publish", { method: "POST" }),
		);
		expect(res.status).toBe(200);
		expect(publishMediaAsset).toHaveBeenCalledWith({ id: "asset-1" });
	});

	test("POST /cms/media/:id/publish returns 409 when the adapter rejects it", async () => {
		const adapter = makeAdapter({
			publishMediaAsset: async () => {
				throw new Error("no version to publish");
			},
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/asset-1/publish", { method: "POST" }),
		);
		expect(res.status).toBe(409);
	});

	test("GET /cms/media/:id/versions lists version history", async () => {
		const summary = {
			id: "v1",
			assetId: "asset-1",
			createdAt: new Date(),
			publishedAt: null,
			createdBy: null,
			fileChanged: true,
		};
		const adapter = makeAdapter({
			listMediaVersions: mock(async () => [summary]),
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/asset-1/versions"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(adapter.listMediaVersions).toHaveBeenCalledWith({ id: "asset-1" });
	});

	test("GET /cms/media/versions/:versionId returns a version's snapshot", async () => {
		const version = {
			id: "v1",
			assetId: "asset-1",
			key: "k",
			filename: "f",
			mimeType: "image/jpeg",
			size: 1,
			publicUrl: "https://cdn.example.com/k",
			metadata: { alt: "hi" },
			createdAt: new Date(),
			publishedAt: null,
			createdBy: null,
			fileChanged: true,
		};
		const adapter = makeAdapter({
			getMediaVersion: mock(async () => version),
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/versions/v1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe("v1");
	});

	test("GET /cms/media/versions/:versionId 404s when missing", async () => {
		const adapter = makeAdapter({ getMediaVersion: mock(async () => null) });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/versions/missing"));
		expect(res.status).toBe(404);
	});

	test("PATCH /cms/media/:id updates metadata via a new version", async () => {
		const updateMediaAsset = mock(async ({ id }: { id: string }) =>
			makeMediaAsset({ id }),
		);
		const adapter = makeAdapter({
			updateMediaAsset,
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/asset-1", {
				method: "PATCH",
				body: JSON.stringify({ metadata: { alt: "A cat" } }),
			}),
		);
		expect(res.status).toBe(200);
		expect(updateMediaAsset).toHaveBeenCalledWith(
			expect.objectContaining({ id: "asset-1", metadata: { alt: "A cat" } }),
		);
	});

	test("POST /cms/media/:id/restore restores a past version into a new draft", async () => {
		const restoreMediaVersion = mock(async ({ id }: { id: string }) =>
			makeMediaAsset({ id }),
		);
		const adapter = makeAdapter({
			restoreMediaVersion,
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/asset-1/restore", {
				method: "POST",
				body: JSON.stringify({ versionId: "v1" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(restoreMediaVersion).toHaveBeenCalledWith({
			id: "asset-1",
			versionId: "v1",
		});
	});
});

describe("media routes - public", () => {
	test("GET /cms/media/public/:key redirects to the published asset", async () => {
		const asset = makeMediaAsset({
			key: "live.jpg",
			publicUrl: "https://cdn.example.com/live.jpg",
			status: "published",
		});
		const adapter = makeAdapter({
			getPublishedMediaAsset: mock(async () => asset),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/public/live.jpg", { redirect: "manual" } as never),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe(
			"https://cdn.example.com/live.jpg",
		);
	});

	test("GET /cms/media/public/:key 404s for a draft asset (or unknown key)", async () => {
		const adapter = makeAdapter({
			getPublishedMediaAsset: mock(async () => null),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/public/draft.jpg"));
		expect(res.status).toBe(404);
	});

	test("GET /cms/media/public/:key requires no auth token", async () => {
		const adapter = makeAdapter({
			getPublishedMediaAsset: mock(async () => null),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			new Request("http://localhost/cms/media/public/x.jpg"),
		);
		expect(res.status).toBe(404); // reaches the handler, not a 401
	});
});

describe("media routes - tags and saved views", () => {
	test("GET /cms/media?tagIds=a,b filters assets (AND by default)", async () => {
		const listMediaAssets = mock(async () => []);
		const adapter = makeAdapter({ listMediaAssets });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media?tagIds=a,b"));
		expect(res.status).toBe(200);
		expect(listMediaAssets).toHaveBeenCalledWith({
			tagIds: ["a", "b"],
			tagOperator: "AND",
		});
	});

	test("GET /cms/media?tagIds=a,b&tagOperator=OR passes OR through", async () => {
		const listMediaAssets = mock(async () => []);
		const adapter = makeAdapter({ listMediaAssets });
		const app = makeApp(adapter, [makePlugin()]);
		await app.handle(req("/cms/media?tagIds=a,b&tagOperator=OR"));
		expect(listMediaAssets).toHaveBeenCalledWith({
			tagIds: ["a", "b"],
			tagOperator: "OR",
		});
	});

	test("GET /cms/media/tags lists tags", async () => {
		const tag = { id: "t1", name: "hero", createdAt: new Date() };
		const adapter = makeAdapter({ listTags: mock(async () => [tag]) });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/tags"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("hero");
	});

	test("POST /cms/media/tags creates a tag", async () => {
		const createTag = mock(
			async ({ id, name }: { id: string; name: string }) => ({
				id,
				name,
				createdAt: new Date(),
			}),
		);
		const adapter = makeAdapter({ createTag });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/tags", {
				method: "POST",
				body: JSON.stringify({ name: "banner" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(createTag).toHaveBeenCalledWith(
			expect.objectContaining({ name: "banner" }),
		);
	});

	test("DELETE /cms/media/tags/:id removes a tag", async () => {
		const deleteTag = mock(async () => {});
		const adapter = makeAdapter({ deleteTag });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/tags/t1", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(deleteTag).toHaveBeenCalledWith({ id: "t1" });
	});

	test("PUT /cms/media/:id/tags replaces an asset's tag set", async () => {
		const setAssetTags = mock(async () => {});
		const adapter = makeAdapter({
			setAssetTags,
			getMediaAssetById: mock(async () => makeMediaAsset({ id: "asset-1" })),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/asset-1/tags", {
				method: "PUT",
				body: JSON.stringify({ tagIds: ["t1", "t2"] }),
			}),
		);
		expect(res.status).toBe(200);
		expect(setAssetTags).toHaveBeenCalledWith({
			assetId: "asset-1",
			tagIds: ["t1", "t2"],
		});
	});

	test("GET /cms/media/views lists saved views", async () => {
		const view = {
			id: "v1",
			name: "Banners",
			ownerId: null,
			operator: "OR" as const,
			tagIds: ["t1"],
			createdAt: new Date(),
		};
		const adapter = makeAdapter({ listSavedViews: mock(async () => [view]) });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/views"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].name).toBe("Banners");
	});

	test("POST /cms/media/views creates a saved view", async () => {
		const createSavedView = mock(
			async (opts: { id: string; name: string }) => ({
				id: opts.id,
				name: opts.name,
				ownerId: null,
				operator: "AND" as const,
				tagIds: ["t1"],
				createdAt: new Date(),
			}),
		);
		const adapter = makeAdapter({ createSavedView });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/views", {
				method: "POST",
				body: JSON.stringify({
					name: "Banners",
					operator: "AND",
					tagIds: ["t1"],
				}),
			}),
		);
		expect(res.status).toBe(200);
		expect(createSavedView).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Banners", operator: "AND" }),
		);
	});

	test("DELETE /cms/media/views/:id removes a saved view", async () => {
		const deleteSavedView = mock(async () => {});
		const adapter = makeAdapter({ deleteSavedView });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/views/v1", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(deleteSavedView).toHaveBeenCalledWith({ id: "v1" });
	});
});

describe("media tag ACL", () => {
	test("GET /cms/media requires MEDIA_VIEW even with a tag grant", async () => {
		// No global perms at all, not even MEDIA_VIEW - a tag grant alone can't
		// open the library route.
		const adapter = makeAdapter();
		const app = makeApp(
			adapter,
			[makePlugin()],
			makeUserAuth({ userId: "u1", permissions: [] }),
		);
		const res = await app.handle(req("/cms/media"));
		expect(res.status).toBe(403);
	});

	test("GET /cms/media narrows to a subject when the caller lacks ADMIN_READ", async () => {
		const listMediaAssets = mock(async () => []);
		const adapter = makeAdapter({ listMediaAssets });
		const app = makeApp(
			adapter,
			[makePlugin()],
			makeUserAuth({
				userId: "u1",
				groupIds: ["g1"],
				permissions: ["cms:media:view"],
			}),
		);
		const res = await app.handle(req("/cms/media"));
		expect(res.status).toBe(200);
		expect(listMediaAssets).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: { userId: "u1", groupIds: ["g1"] },
			}),
		);
	});

	test("GET /cms/media skips the subject for a caller with ADMIN_READ", async () => {
		const listMediaAssets = mock(async () => []);
		const adapter = makeAdapter({ listMediaAssets });
		const app = makeApp(adapter, [makePlugin()]); // default admin token
		await app.handle(req("/cms/media"));
		expect(listMediaAssets).toHaveBeenCalledWith(
			expect.objectContaining({ subject: undefined }),
		);
	});

	test("PATCH /cms/media/:id returns 403 for an untagged asset without global write (no tag to fall back on)", async () => {
		const adapter = makeAdapter({
			getMediaAssetById: mock(async () => makeMediaAsset({ tagIds: [] })),
		});
		const app = makeApp(
			adapter,
			[makePlugin()],
			makeUserAuth({ userId: "u1", permissions: ["cms:media:view"] }),
		);
		const res = await app.handle(
			req("/cms/media/asset-1", {
				method: "PATCH",
				body: JSON.stringify({ metadata: {} }),
			}),
		);
		expect(res.status).toBe(403);
	});

	test("PATCH /cms/media/:id succeeds via a tag-scoped edit grant", async () => {
		const updateMediaAsset = mock(async ({ id }: { id: string }) =>
			makeMediaAsset({ id }),
		);
		const adapter = makeAdapter({
			getMediaAssetById: mock(async () => makeMediaAsset({ tagIds: ["t1"] })),
			updateMediaAsset,
			getEffectiveMediaTagPermissions: mock(async () => ["edit" as const]),
		});
		const app = makeApp(
			adapter,
			[makePlugin()],
			makeUserAuth({ userId: "u1", permissions: ["cms:media:view"] }),
		);
		const res = await app.handle(
			req("/cms/media/asset-1", {
				method: "PATCH",
				body: JSON.stringify({ metadata: { alt: "hi" } }),
			}),
		);
		expect(res.status).toBe(200);
		expect(updateMediaAsset).toHaveBeenCalledTimes(1);
	});

	test("DELETE /cms/media/:key requires a tag-scoped delete grant, not just edit", async () => {
		const adapter = makeAdapter({
			listMediaAssets: mock(async () => [makeMediaAsset({ tagIds: ["t1"] })]),
			getEffectiveMediaTagPermissions: mock(async () => ["edit" as const]),
		});
		const app = makeApp(
			adapter,
			[makePlugin()],
			makeUserAuth({ userId: "u1", permissions: ["cms:media:view"] }),
		);
		const res = await app.handle(
			req("/cms/media/123-photo.jpg", { method: "DELETE" }),
		);
		expect(res.status).toBe(403);
	});

	test("POST /cms/media/tags (create) requires MEDIA_TAG_MANAGE, not MEDIA_UPLOAD", async () => {
		const createTag = mock(
			async ({ id, name }: { id: string; name: string }) => ({
				id,
				name,
				createdAt: new Date(),
			}),
		);
		const adapter = makeAdapter({ createTag });
		const app = makeApp(
			adapter,
			[makePlugin()],
			makeUserAuth({
				userId: "u1",
				permissions: ["cms:media:view", "cms:media:upload"],
			}),
		);
		const res = await app.handle(
			req("/cms/media/tags", {
				method: "POST",
				body: JSON.stringify({ name: "x" }),
			}),
		);
		expect(res.status).toBe(403);
		expect(createTag).not.toHaveBeenCalled();
	});

	test("POST /cms/media/tags/:id/grants adds a tag grant (requires MEDIA_TAG_MANAGE)", async () => {
		const addMediaTagGrant = mock(
			async (opts: {
				id: string;
				tagId: string;
				subjectType: "user" | "group";
				subjectId: string;
				permission: "view" | "upload" | "edit" | "delete" | "publish";
			}) => opts,
		);
		const adapter = makeAdapter({ addMediaTagGrant });
		const app = makeApp(adapter, [makePlugin()]); // default admin token has everything
		const res = await app.handle(
			req("/cms/media/tags/t1/grants", {
				method: "POST",
				body: JSON.stringify({
					subjectType: "group",
					subjectId: "g1",
					permission: "view",
				}),
			}),
		);
		expect(res.status).toBe(200);
		expect(addMediaTagGrant).toHaveBeenCalledWith(
			expect.objectContaining({
				tagId: "t1",
				subjectType: "group",
				subjectId: "g1",
				permission: "view",
			}),
		);
	});

	test("GET /cms/media/tags/:id/grants lists grants for a tag", async () => {
		const grant = {
			id: "g1",
			tagId: "t1",
			subjectType: "user" as const,
			subjectId: "u1",
			permission: "view" as const,
		};
		const adapter = makeAdapter({
			listMediaTagGrants: mock(async () => [grant]),
		});
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(req("/cms/media/tags/t1/grants"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([grant]);
	});

	test("DELETE /cms/media/tag-grants/:id removes a grant", async () => {
		const removeMediaTagGrant = mock(async () => {});
		const adapter = makeAdapter({ removeMediaTagGrant });
		const app = makeApp(adapter, [makePlugin()]);
		const res = await app.handle(
			req("/cms/media/tag-grants/g1", { method: "DELETE" }),
		);
		expect(res.status).toBe(200);
		expect(removeMediaTagGrant).toHaveBeenCalledWith({ id: "g1" });
	});
});

function makePlugin() {
	return mediaPlugin({ storage: makeStorage() });
}
