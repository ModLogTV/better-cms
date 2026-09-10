import { mock } from "bun:test";
import { Elysia } from "elysia";
import { tokenAuthAdapter } from "../../auth/token-adapter";
import type {
	CMSAdapter,
	MediaAsset,
	MediaVersionSummary,
	Page,
	PageGrant,
	PageSummary,
	PageTreeNode,
	PageVersionSummary,
} from "../../core/adapter";
import { createCMS } from "../../core/index";
import { key, vars } from "../../i18n/markers";
import { defineNamespace } from "../../i18n/namespace";
import { toElysiaPlugin } from "../index";

export const TOKEN = "test-token";

export const ns = defineNamespace({
	name: "nav",
	definition: {
		title: key,
		greeting: vars<{ name: string }>(),
	},
});

export function makeMediaAsset(
	overrides: Partial<MediaAsset> = {},
): MediaAsset {
	return {
		id: "asset-1",
		key: "123-photo.jpg",
		filename: "photo.jpg",
		mimeType: "image/jpeg",
		size: 12345,
		publicUrl: "https://cdn.example.com/123-photo.jpg",
		confirmedAt: null,
		createdAt: new Date("2024-01-01"),
		status: "draft",
		metadata: {},
		...overrides,
	};
}

export function makeAdapter(overrides: Partial<CMSAdapter> = {}): CMSAdapter {
	return {
		getTranslations: mock(async () => ({ title: "Home" })),
		upsertTranslations: mock(async () => {}),
		listNamespaceLocaleMeta: mock(async () => []),
		getPage: mock(async () => null),
		getPageById: mock(async () => null),
		upsertPage: mock(async () => {}),
		createPage: mock(async (opts) => makePage(opts)),
		addPageLocale: mock(async (opts) =>
			makePage({ id: opts.id, nodeId: opts.nodeId, locale: opts.locale }),
		),
		publishPage: mock(async () => {}),
		listPageVersions: mock(async () => [] as PageVersionSummary[]),
		getPageVersion: mock(async () => null),
		restorePageVersion: mock(async (opts) => makePage({ id: opts.id })),
		listPages: mock(async () => ({ items: [] as PageSummary[], total: 0 })),
		listPageTree: mock(async () => [] as PageTreeNode[]),
		movePage: mock(async () => {}),
		listPageGrants: mock(async () => [] as PageGrant[]),
		addPageGrant: mock(async (opts) => ({
			id: opts.id,
			nodeId: opts.nodeId,
			subjectType: opts.subjectType,
			subjectId: opts.subjectId,
			permission: opts.permission,
			locale: opts.locale ?? null,
		})),
		removePageGrant: mock(async () => {}),
		getEffectivePagePermissions: mock(async () => [] as string[]),
		listLocales: mock(async () => []),
		upsertLocale: mock(async () => {}),
		deleteLocale: mock(async () => {}),
		createMediaAsset: mock(async (opts) =>
			makeMediaAsset({
				id: opts.id,
				key: opts.key,
				filename: opts.filename,
				mimeType: opts.mimeType,
				size: opts.size,
				publicUrl: opts.publicUrl,
			}),
		),
		confirmMediaAsset: mock(async () => {}),
		listMediaAssets: mock(async () => [] as MediaAsset[]),
		deleteMediaAsset: mock(async () => {}),
		publishMediaAsset: mock(async () => {}),
		updateMediaAsset: mock(async (opts) => makeMediaAsset({ id: opts.id })),
		listMediaVersions: mock(async () => [] as MediaVersionSummary[]),
		getMediaVersion: mock(async () => null),
		restoreMediaVersion: mock(async (opts) => makeMediaAsset({ id: opts.id })),
		getPublishedMediaAsset: mock(async () => null),
		...overrides,
	};
}

export function makePage(overrides: Partial<Page> = {}): Page {
	return {
		id: "page-1",
		nodeId: "node-1",
		parentId: null,
		slug: "home",
		path: "home",
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
	auth: import("../../auth/adapter").CMSAuthAdapter = tokenAuthAdapter({
		readToken: TOKEN,
		adminToken: TOKEN,
	}),
) {
	const cms = createCMS({
		database: adapter,
		namespaces: [ns],
		auth,
		plugins,
	});
	return new Elysia().use(toElysiaPlugin(cms));
}

/** Auth adapter stub for a signed-in user with no global CMS permissions - used to test page ACL fallback. */
export function makeUserAuth(opts: {
	userId: string;
	groupIds?: string[];
	permissions?: string[];
}): import("../../auth/adapter").CMSAuthAdapter {
	return {
		async verifyRequest() {
			return {
				authorized: true,
				permissions: opts.permissions ?? [],
				userId: opts.userId,
				groupIds: opts.groupIds ?? [],
			};
		},
	};
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
