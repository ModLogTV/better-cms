import { mock } from "bun:test";
import { Elysia } from "elysia";
import type { CMSAdapter, Page, PageSummary } from "../../core/adapter";
import { createCMS } from "../../core/index";
import { key, vars } from "../../i18n/markers";
import { defineNamespace } from "../../i18n/namespace";
import { toElysiaPlugin } from "../index";

export const TOKEN = "test-token";

export const ns = defineNamespace("nav", {
	title: key,
	greeting: vars<{ name: string }>(),
});

export function makeAdapter(overrides: Partial<CMSAdapter> = {}): CMSAdapter {
	return {
		getTranslations: mock(async () => ({ title: "Home" })),
		upsertTranslations: mock(async () => {}),
		getPage: mock(async () => null),
		upsertPage: mock(async () => {}),
		publishPage: mock(async () => {}),
		listPages: mock(async () => [] as PageSummary[]),
		listLocales: mock(async () => []),
		upsertLocale: mock(async () => {}),
		deleteLocale: mock(async () => {}),
		...overrides,
	};
}

export function makePage(overrides: Partial<Page> = {}): Page {
	return {
		id: "page-1",
		slug: "home",
		locale: "en",
		blocks: [],
		status: "draft",
		publishedAt: null,
		updatedAt: new Date(),
		...overrides,
	};
}

export function makeApp(
	adapter: CMSAdapter,
	plugins: import("../../core/plugin").CMSPlugin[] = [],
) {
	const cms = createCMS({
		database: adapter,
		namespaces: [ns],
		auth: { internalToken: TOKEN },
		plugins,
	});
	return new Elysia().use(toElysiaPlugin(cms));
}

export function req(
	path: string,
	init?: RequestInit & { token?: string },
): Request {
	const token = init?.token ?? TOKEN;
	return new Request(`http://localhost${path}`, {
		...init,
		headers: {
			"x-internal-token": token,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
}
