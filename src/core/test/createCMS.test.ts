import { describe, expect, mock, test } from "bun:test";
import { key, vars } from "../../i18n/markers";
import { defineNamespace } from "../../i18n/namespace";
import type { CMSAdapter } from "../adapter";
import { createCMS } from "../index";
import type { CMSPlugin } from "../plugin";

const mockAdapter: CMSAdapter = {
	getTranslations: mock(async () => ({})),
	upsertTranslations: mock(async () => {}),
	getPage: mock(async () => null),
	upsertPage: mock(async () => {}),
	publishPage: mock(async () => {}),
	listPages: mock(async () => []),
	listLocales: mock(async () => []),
	upsertLocale: mock(async () => {}),
	deleteLocale: mock(async () => {}),
};

const ns = defineNamespace("nav", {
	title: key,
	greeting: vars<{ name: string }>(),
});

describe("createCMS", () => {
	test("returns CMSInstance with correct shape", () => {
		const cms = createCMS({
			database: mockAdapter,
			namespaces: [ns],
			auth: { readToken: "read", adminToken: "admin" },
		});

		expect(cms.namespaces).toHaveLength(1);
		expect(cms.namespaces[0].name).toBe("nav");
		expect(cms.auth.readToken).toBe("read");
		expect(cms.auth.adminToken).toBe("admin");
		expect(cms.$Infer.Namespaces["nav"]).toBeDefined();
	});

	test("throws if namespaces empty", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [],
				auth: { readToken: "x", adminToken: "x" },
			}),
		).toThrow("namespaces must not be empty");
	});

	test("throws if readToken empty", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [ns],
				auth: { readToken: "", adminToken: "x" },
			}),
		).toThrow("auth.readToken must not be empty");
	});

	test("throws if adminToken empty", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [ns],
				auth: { readToken: "x", adminToken: "" },
			}),
		).toThrow("auth.adminToken must not be empty");
	});

	test("runs plugins and extends $Infer", () => {
		const plugin: CMSPlugin = {
			name: "test-plugin",
			init: mock(() => {}),
			extendInfer: (current) =>
				({ ...current, custom: true }) as ReturnType<
					NonNullable<CMSPlugin["extendInfer"]>
				>,
		};
		const cms = createCMS({
			database: mockAdapter,
			namespaces: [ns],
			auth: { readToken: "x", adminToken: "x" },
			plugins: [plugin],
		});
		expect(plugin.init).toHaveBeenCalledTimes(1);
		expect((cms.$Infer as unknown as { custom: boolean }).custom).toBe(true);
	});

	test("upserts initialLocales on startup", async () => {
		const upserted: any[] = [];
		const adapter = {
			...mockAdapter,
			upsertLocale: async (code: any, name: any, isDefault: any) => {
				upserted.push({ code, name, isDefault });
			},
		} as any;

		createCMS({
			database: adapter,
			namespaces: [ns],
			auth: { readToken: "r", adminToken: "a" },
			initialLocales: [
				{ code: "en", name: "English", isDefault: true },
				{ code: "de", name: "German" },
			],
		});

		// wait for fire-and-forget promises
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(upserted).toHaveLength(2);
		expect(upserted).toContainEqual({
			code: "en",
			name: "English",
			isDefault: true,
		});
		expect(upserted).toContainEqual({
			code: "de",
			name: "German",
			isDefault: undefined,
		});
	});

	test("throws if more than one initialLocale is set as default", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [ns],
				auth: { readToken: "r", adminToken: "a" },
				initialLocales: [
					{ code: "en", name: "English", isDefault: true },
					{ code: "de", name: "German", isDefault: true },
				],
			}),
		).toThrow("createCMS: only one locale can be set as default");
	});
});
