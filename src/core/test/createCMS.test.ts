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
			auth: { internalToken: "secret" },
		});

		expect(cms.namespaces).toHaveLength(1);
		expect(cms.namespaces[0].name).toBe("nav");
		expect(cms.auth.internalToken).toBe("secret");
		expect(cms.$Infer.Namespaces["nav"]).toBeDefined();
	});

	test("throws if namespaces empty", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [],
				auth: { internalToken: "x" },
			}),
		).toThrow("namespaces must not be empty");
	});

	test("throws if internalToken empty", () => {
		expect(() =>
			createCMS({
				database: mockAdapter,
				namespaces: [ns],
				auth: { internalToken: "" },
			}),
		).toThrow("internalToken must not be empty");
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
			auth: { internalToken: "x" },
			plugins: [plugin],
		});
		expect(plugin.init).toHaveBeenCalledTimes(1);
		expect((cms.$Infer as unknown as { custom: boolean }).custom).toBe(true);
	});
});
