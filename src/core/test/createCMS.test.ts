import { describe, expect, mock, test } from "bun:test";
import { tokenAuthAdapter } from "../../auth/token-adapter";
import { key, vars } from "../../i18n/markers";
import { defineNamespace } from "../../i18n/namespace";
import type { CMSAdapter } from "../adapter";
import { createCMS } from "../index";
import type { CMSPlugin } from "../plugin";

const mockAdapter: CMSAdapter = {
	getTranslations: mock(async () => ({})),
	upsertTranslations: mock(async () => {}),
	listNamespaceLocaleMeta: mock(async () => []),
	getPage: mock(async () => null),
	upsertPage: mock(async () => {}),
	createPage: mock(async ({ id, slug, locale }) => ({
		id,
		slug,
		locale,
		blocks: [],
		status: "draft" as const,
		publishedAt: null,
		updatedAt: new Date(),
	})),
	publishPage: mock(async () => {}),
	listPages: mock(async () => ({ items: [], total: 0 })),
	listLocales: mock(async () => []),
	upsertLocale: mock(async () => {}),
	deleteLocale: mock(async () => {}),
	createMediaAsset: mock(async () => ({
		id: "1",
		key: "k",
		filename: "f",
		mimeType: "image/jpeg",
		size: 0,
		publicUrl: "",
		confirmedAt: null,
		createdAt: new Date(),
	})),
	confirmMediaAsset: mock(async () => {}),
	listMediaAssets: mock(async () => []),
	deleteMediaAsset: mock(async () => {}),
};

const ns = defineNamespace({
	name: "nav",
	definition: {
		title: key,
		greeting: vars<{ name: string }>(),
	},
});

const testAuth = tokenAuthAdapter({ readToken: "read", adminToken: "admin" });

describe("createCMS", () => {
	test("returns CMSInstance with correct shape", () => {
		const cms = createCMS({
			database: mockAdapter,
			namespaces: [ns],
			auth: testAuth,
		});

		expect(cms.namespaces).toHaveLength(1);
		expect(cms.namespaces[0].name).toBe("nav");
		expect(typeof cms.auth.verifyRequest).toBe("function");
		expect(cms.$Infer.Namespaces.nav).toBeDefined();
	});

	test("throws if namespaces empty", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [],
				auth: testAuth,
			}),
		).toThrow("namespaces must not be empty");
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
			auth: testAuth,
			plugins: [plugin],
		});
		expect(plugin.init).toHaveBeenCalledTimes(1);
		expect((cms.$Infer as unknown as { custom: boolean }).custom).toBe(true);
	});

	test("upserts initialLocales on startup", async () => {
		const upserted: unknown[] = [];
		const adapter = {
			...mockAdapter,
			upsertLocale: async ({
				code,
				name,
				isDefault,
			}: {
				code: string;
				name: string;
				isDefault?: boolean;
			}) => {
				upserted.push({ code, name, isDefault });
			},
		} as unknown as CMSAdapter;

		createCMS({
			database: adapter,
			namespaces: [ns],
			auth: testAuth,
			initialLocales: [
				{ code: "en", name: "English", isDefault: true },
				{ code: "de", name: "German" },
			],
		});

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
				auth: testAuth,
				initialLocales: [
					{ code: "en", name: "English", isDefault: true },
					{ code: "de", name: "German", isDefault: true },
				],
			}),
		).toThrow("createCMS: only one locale can be set as default");
	});

	test("warns and skips upsertAdminUser if adapter does not implement it", () => {
		const warnSpy = mock(() => {});
		const origWarn = console.warn;
		console.warn = warnSpy;
		try {
			createCMS({
				database: mockAdapter,
				namespaces: [ns],
				auth: testAuth,
				initialAdminUser: {
					email: "admin@example.com",
					name: "Admin",
					password: "pw",
				},
			});
			expect(warnSpy).toHaveBeenCalledTimes(1);
		} finally {
			console.warn = origWarn;
		}
	});

	test("calls upsertAdminUser if adapter implements it", async () => {
		const upserted: unknown[] = [];
		const authWithUpsert = {
			...testAuth,
			upsertAdminUser: async (user: unknown) => {
				upserted.push(user);
			},
		};

		createCMS({
			database: mockAdapter,
			namespaces: [ns],
			auth: authWithUpsert,
			initialAdminUser: {
				email: "admin@example.com",
				name: "Admin",
				password: "pw",
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(upserted).toHaveLength(1);
		expect(upserted[0]).toMatchObject({ email: "admin@example.com" });
	});
});
