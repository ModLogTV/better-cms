import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createAdminClient } from "../index";

const CMS_URL = "http://cms.test";
const TOKEN = "admin-token";

describe("AdminClient Media Utilities", () => {
	const admin = createAdminClient({ cmsUrl: CMS_URL, token: TOKEN });

	afterEach(() => {
		mock.restore();
	});

	test("media.upload performs presign, PUT, and confirm", async () => {
		let putCalled = false;
		let putUrl = "";
		let putBody: unknown = null;
		let confirmCalled = false;

		spyOn(globalThis, "fetch").mockImplementation(((url: unknown, init: unknown) => {
			const urlStr = (url as string).toString();
			const reqInit = init as RequestInit;
			const path = urlStr.replace(CMS_URL, "");
			if (path === "/cms/media/presign" && reqInit?.method === "POST") {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							uploadUrl: "http://storage.test/upload",
							publicUrl: "http://storage.test/file.png",
							assetId: "asset-123",
						}),
						{ status: 200 },
					),
				);
			}
			if (urlStr === "http://storage.test/upload" && reqInit?.method === "PUT") {
				putCalled = true;
				putUrl = urlStr;
				putBody = reqInit.body;
				return Promise.resolve(new Response(null, { status: 200 }));
			}
			if (path === "/cms/media/asset-123/confirm" && reqInit?.method === "POST") {
				confirmCalled = true;
				return Promise.resolve(new Response(null, { status: 204 }));
			}
			return Promise.resolve(new Response(null, { status: 404 }));
		}) as typeof fetch);

		const result = await admin.media.upload({
			file: { name: "test.png", type: "image/png", size: 100 },
			body: "binary-data",
		});

		expect(result.publicUrl).toBe("http://storage.test/file.png");
		expect(result.assetId).toBe("asset-123");
		expect(putCalled).toBe(true);
		expect(putUrl).toBe("http://storage.test/upload");
		expect(putBody).toBe("binary-data");
		expect(confirmCalled).toBe(true);
	});

	test("media.delete calls the correct endpoint", async () => {
		let deleteCalled = false;
		let deletePath = "";

		spyOn(globalThis, "fetch").mockImplementation(((url: any, init: any) => {
			const path = url.toString().replace(CMS_URL, "");
			if (path === "/cms/media/my-key.png" && init?.method === "DELETE") {
				deleteCalled = true;
				deletePath = path;
				return Promise.resolve(
					new Response(JSON.stringify({ ok: true }), { status: 200 }),
				);
			}
			return Promise.resolve(new Response(null, { status: 404 }));
		}) as any);

		await admin.media.delete({ key: "my-key.png" });

		expect(deleteCalled).toBe(true);
		expect(deletePath).toBe("/cms/media/my-key.png");
	});
});
