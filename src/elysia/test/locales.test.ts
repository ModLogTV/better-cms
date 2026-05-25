import { describe, expect, mock, test } from "bun:test";
import { createCMS } from "../../core/index";
import { toElysiaPlugin } from "../index";
import { makeAdapter, ns, req } from "./helpers";

describe("locale management routes", () => {
	const adapter = makeAdapter({
		listLocales: mock(async () => [
			{ code: "en", name: "English", isDefault: true, updatedAt: new Date() },
		]),
		upsertLocale: mock(async () => {}),
		deleteLocale: mock(async () => {}),
	});

	const cms = createCMS({
		database: adapter,
		namespaces: [ns],
		auth: { readToken: "test-token", adminToken: "test-token" },
	});

	const app = toElysiaPlugin(cms);

	test("GET /cms/admin/locales returns list of locales", async () => {
		const res = await app.handle(
			req("/cms/admin/locales", { token: "test-token" }),
		);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toHaveLength(1);
		expect(data[0].code).toBe("en");
	});

	test("PUT /cms/admin/locales upserts a locale", async () => {
		const res = await app.handle(
			req("/cms/admin/locales", {
				method: "PUT",
				body: JSON.stringify({ code: "de", name: "German", isDefault: false }),
				token: "test-token",
			}),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(adapter.upsertLocale).toHaveBeenCalledWith({
			code: "de",
			name: "German",
			isDefault: false,
		});
	});

	test("DELETE /cms/admin/locales/:code removes a locale", async () => {
		const res = await app.handle(
			req("/cms/admin/locales/de", { method: "DELETE", token: "test-token" }),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(adapter.deleteLocale).toHaveBeenCalledWith({ code: "de" });
	});
});
