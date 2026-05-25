import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createAdminClient } from "../index";

const CMS_URL = "http://cms.test";
const TOKEN = "admin-token";

describe("AdminClient Media Utilities", () => {
	const admin = createAdminClient({ cmsUrl: CMS_URL, token: TOKEN });

	afterEach(() => {
		mock.restore();
	});

	test("media.upload performs presign and then PUT", async () => {
		let putCalled = false;
		let putUrl = "";
		let putBody: any = null;

		spyOn(globalThis, "fetch").mockImplementation(((url: any, init: any) => {
			const path = url.toString().replace(CMS_URL, "");
			if (path === "/cms/media/presign" && init?.method === "POST") {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							uploadUrl: "http://storage.test/upload",
							publicUrl: "http://storage.test/file.png",
						}),
						{ status: 200 },
					),
				);
			}
			if (
				url.toString() === "http://storage.test/upload" &&
				init?.method === "PUT"
			) {
				putCalled = true;
				putUrl = url.toString();
				putBody = init.body;
				return Promise.resolve(new Response(null, { status: 200 }));
			}
			return Promise.resolve(new Response(null, { status: 404 }));
		}) as any);

		const result = await admin.media.upload({
			file: { name: "test.png", type: "image/png", size: 100 },
			body: "binary-data",
		});

		expect(result.publicUrl).toBe("http://storage.test/file.png");
		expect(putCalled).toBe(true);
		expect(putUrl).toBe("http://storage.test/upload");
		expect(putBody).toBe("binary-data");
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
