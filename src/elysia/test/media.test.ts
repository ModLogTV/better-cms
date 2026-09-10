import { describe, expect, mock, test } from "bun:test";
import type { CMSStorageAdapter } from "../../core/storage";
import { mediaPlugin } from "../../plugins/media/index";
import { makeAdapter, makeApp, makeMediaAsset, req } from "./helpers";

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
		const adapter = makeAdapter({ deleteMediaAsset });
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
		const adapter = makeAdapter({ publishMediaAsset });
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
		const adapter = makeAdapter({ getMediaVersion: mock(async () => version) });
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
		const adapter = makeAdapter({ updateMediaAsset });
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
		const adapter = makeAdapter({ restoreMediaVersion });
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

function makePlugin() {
	return mediaPlugin({ storage: makeStorage() });
}
