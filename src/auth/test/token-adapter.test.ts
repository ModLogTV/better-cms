import { describe, expect, test } from "bun:test";
import { CMS_PERMISSIONS, CMS_WILDCARD_PERMISSION } from "../permissions";
import { tokenAuthAdapter } from "../token-adapter";

const READ = "read-secret";
const ADMIN = "admin-secret";

const adapter = tokenAuthAdapter({ readToken: READ, adminToken: ADMIN });

describe("tokenAuthAdapter – verifyRequest", () => {
	test("adminToken via x-cms-token grants wildcard", async () => {
		const result = await adapter.verifyRequest({ "x-cms-token": ADMIN });
		expect(result.authorized).toBe(true);
		expect(result.permissions).toContain(CMS_WILDCARD_PERMISSION);
	});

	test("adminToken via x-internal-token (legacy) grants wildcard", async () => {
		const result = await adapter.verifyRequest({ "x-internal-token": ADMIN });
		expect(result.authorized).toBe(true);
		expect(result.permissions).toContain(CMS_WILDCARD_PERMISSION);
	});

	test("readToken grants read-only permission subset", async () => {
		const result = await adapter.verifyRequest({ "x-cms-token": READ });
		expect(result.authorized).toBe(true);
		expect(result.permissions).toContain(CMS_PERMISSIONS.TRANSLATIONS_READ);
		expect(result.permissions).toContain(CMS_PERMISSIONS.LOCALES_READ);
		expect(result.permissions).toContain(CMS_PERMISSIONS.PAGES_READ);
		expect(result.permissions).toContain(CMS_PERMISSIONS.ADMIN_READ);
	});

	test("readToken does not grant write permissions", async () => {
		const result = await adapter.verifyRequest({ "x-cms-token": READ });
		expect(result.permissions).not.toContain(
			CMS_PERMISSIONS.TRANSLATIONS_WRITE,
		);
		expect(result.permissions).not.toContain(CMS_PERMISSIONS.LOCALES_WRITE);
		expect(result.permissions).not.toContain(CMS_PERMISSIONS.PAGES_PUBLISH);
		expect(result.permissions).not.toContain(CMS_WILDCARD_PERMISSION);
	});

	test("x-cms-token takes precedence over x-internal-token", async () => {
		const result = await adapter.verifyRequest({
			"x-cms-token": ADMIN,
			"x-internal-token": READ,
		});
		expect(result.permissions).toContain(CMS_WILDCARD_PERMISSION);
	});

	test("wrong token returns unauthorized", async () => {
		const result = await adapter.verifyRequest({ "x-cms-token": "bad-token" });
		expect(result.authorized).toBe(false);
		expect(result.permissions).toHaveLength(0);
	});

	test("missing token returns unauthorized", async () => {
		const result = await adapter.verifyRequest({});
		expect(result.authorized).toBe(false);
		expect(result.permissions).toHaveLength(0);
	});

	test("undefined header value returns unauthorized", async () => {
		const result = await adapter.verifyRequest({ "x-cms-token": undefined });
		expect(result.authorized).toBe(false);
	});

	test("userId is undefined (token auth has no user concept)", async () => {
		const result = await adapter.verifyRequest({ "x-cms-token": ADMIN });
		expect(result.userId).toBeUndefined();
	});
});

describe("tokenAuthAdapter – construction", () => {
	test("throws if readToken empty", () => {
		expect(() => tokenAuthAdapter({ readToken: "", adminToken: "x" })).toThrow(
			"readToken must not be empty",
		);
	});

	test("throws if adminToken empty", () => {
		expect(() => tokenAuthAdapter({ readToken: "x", adminToken: "" })).toThrow(
			"adminToken must not be empty",
		);
	});

	test("management is undefined", () => {
		expect(adapter.management).toBeUndefined();
	});

	test("upsertAdminUser is undefined", () => {
		expect(adapter.upsertAdminUser).toBeUndefined();
	});
});
