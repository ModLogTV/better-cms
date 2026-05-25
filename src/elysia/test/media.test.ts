import { describe, expect, test } from "bun:test";
import type { CMSStorageAdapter } from "../../core/storage";
import { mediaPlugin } from "../../plugins/media/index";
import { makeAdapter, makeApp, req } from "./helpers";

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

describe("media routes", () => {
	test("POST /cms/media/presign returns uploadUrl and publicUrl", async () => {
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
		const body = (await res.json()) as { uploadUrl: string; publicUrl: string };
		expect(body.uploadUrl).toMatch(/^https:\/\/s3\.example\.com\//);
		expect(body.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\//);
	});

	test("publicUrl contains the filename", async () => {
		const storage = makeStorage();
		const app = makeApp(makeAdapter(), [mediaPlugin({ storage })]);
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

	test("presign without storage returns error", async () => {
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

	test("POST without token returns 401", async () => {
		const app = makeApp(makeAdapter(), [
			mediaPlugin({ storage: makeStorage() }),
		]);
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

	test("DELETE /cms/media/:key calls storage.delete", async () => {
		let deletedKey = "";
		const storage = makeStorage({
			delete: async ({ key }) => {
				deletedKey = key;
			},
		});
		const app = makeApp(makeAdapter(), [mediaPlugin({ storage })]);
		const res = await app.handle(
			req("/cms/media/my-file.png", {
				method: "DELETE",
				token: "test-token",
			}),
		);
		expect(res.status).toBe(200);
		expect(deletedKey).toBe("my-file.png");
	});
});
