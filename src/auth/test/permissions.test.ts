import { describe, expect, test } from "bun:test";
import {
	ALL_CMS_PERMISSIONS,
	CMS_PERMISSIONS,
	CMS_WILDCARD_PERMISSION,
	hasAllPermissions,
	hasAnyPermission,
	hasPermission,
} from "../permissions";

describe("hasPermission", () => {
	test("returns true when exact permission present", () => {
		expect(
			hasPermission({
				userPerms: [CMS_PERMISSIONS.TRANSLATIONS_READ],
				required: CMS_PERMISSIONS.TRANSLATIONS_READ,
			}),
		).toBe(true);
	});

	test("returns false when permission absent", () => {
		expect(
			hasPermission({
				userPerms: [CMS_PERMISSIONS.TRANSLATIONS_READ],
				required: CMS_PERMISSIONS.TRANSLATIONS_WRITE,
			}),
		).toBe(false);
	});

	test("returns false for empty userPerms", () => {
		expect(
			hasPermission({ userPerms: [], required: CMS_PERMISSIONS.ADMIN_READ }),
		).toBe(false);
	});

	test("wildcard grants any permission", () => {
		for (const perm of ALL_CMS_PERMISSIONS) {
			expect(
				hasPermission({ userPerms: [CMS_WILDCARD_PERMISSION], required: perm }),
			).toBe(true);
		}
	});

	test("wildcard among other perms still grants", () => {
		expect(
			hasPermission({
				userPerms: [CMS_PERMISSIONS.LOCALES_READ, CMS_WILDCARD_PERMISSION],
				required: CMS_PERMISSIONS.USERS_MANAGE,
			}),
		).toBe(true);
	});

	test("unrelated string does not grant", () => {
		expect(
			hasPermission({
				userPerms: ["other:permission"],
				required: CMS_PERMISSIONS.TRANSLATIONS_READ,
			}),
		).toBe(false);
	});
});

describe("hasAllPermissions", () => {
	test("returns true when all required permissions present", () => {
		expect(
			hasAllPermissions({
				userPerms: [CMS_PERMISSIONS.TRANSLATIONS_READ, CMS_PERMISSIONS.LOCALES_READ],
				required: [CMS_PERMISSIONS.TRANSLATIONS_READ, CMS_PERMISSIONS.LOCALES_READ],
			}),
		).toBe(true);
	});

	test("returns false when any required permission missing", () => {
		expect(
			hasAllPermissions({
				userPerms: [CMS_PERMISSIONS.TRANSLATIONS_READ],
				required: [CMS_PERMISSIONS.TRANSLATIONS_READ, CMS_PERMISSIONS.LOCALES_WRITE],
			}),
		).toBe(false);
	});

	test("returns true for empty required array", () => {
		expect(hasAllPermissions({ userPerms: [], required: [] })).toBe(true);
	});

	test("wildcard satisfies all required", () => {
		expect(
			hasAllPermissions({
				userPerms: [CMS_WILDCARD_PERMISSION],
				required: ALL_CMS_PERMISSIONS,
			}),
		).toBe(true);
	});
});

describe("hasAnyPermission", () => {
	test("returns true when at least one permission matches", () => {
		expect(
			hasAnyPermission({
				userPerms: [CMS_PERMISSIONS.LOCALES_READ],
				required: [CMS_PERMISSIONS.TRANSLATIONS_WRITE, CMS_PERMISSIONS.LOCALES_READ],
			}),
		).toBe(true);
	});

	test("returns false when none match", () => {
		expect(
			hasAnyPermission({
				userPerms: [CMS_PERMISSIONS.LOCALES_READ],
				required: [CMS_PERMISSIONS.TRANSLATIONS_WRITE, CMS_PERMISSIONS.PAGES_PUBLISH],
			}),
		).toBe(false);
	});

	test("returns false for empty required", () => {
		expect(
			hasAnyPermission({ userPerms: [CMS_PERMISSIONS.ADMIN_READ], required: [] }),
		).toBe(false);
	});

	test("wildcard satisfies any required", () => {
		expect(
			hasAnyPermission({
				userPerms: [CMS_WILDCARD_PERMISSION],
				required: [CMS_PERMISSIONS.USERS_MANAGE],
			}),
		).toBe(true);
	});
});

describe("CMS_PERMISSIONS", () => {
	test("all values are namespaced cms: strings", () => {
		for (const val of Object.values(CMS_PERMISSIONS)) {
			expect(val).toMatch(/^cms:/);
		}
	});

	test("ALL_CMS_PERMISSIONS contains every CMS_PERMISSIONS value", () => {
		const values = Object.values(CMS_PERMISSIONS);
		expect(ALL_CMS_PERMISSIONS).toHaveLength(values.length);
		for (const v of values) {
			expect(ALL_CMS_PERMISSIONS).toContain(v);
		}
	});

	test("ALL_CMS_PERMISSIONS does not contain wildcard", () => {
		expect(ALL_CMS_PERMISSIONS).not.toContain(CMS_WILDCARD_PERMISSION);
	});

	test("CMS_WILDCARD_PERMISSION is cms:*", () => {
		expect(CMS_WILDCARD_PERMISSION).toBe("cms:*");
	});
});
