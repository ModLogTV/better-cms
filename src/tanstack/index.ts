import type { AdminClient } from "../admin/types";
import type { RawBlock } from "../core/adapter";

/**
 * Wraps AdminClient methods as TanStack Start server functions.
 * Returns plain async functions — caller wraps with createServerFn() in their app.
 *
 * @example
 * ```ts
 * import { createServerFn } from "@tanstack/start"
 * import { createAdminClient } from "better-cms/admin"
 * import { createServerFns } from "better-cms/tanstack-start"
 *
 * const admin = createAdminClient({ cmsUrl: process.env.CMS_URL, token: process.env.CMS_WRITE_TOKEN })
 * export const cmsFns = createServerFns(admin)
 * ```
 */
export function createServerFns(admin: AdminClient) {
	return {
		listNamespaces: () => admin.namespaces.list(),
		describeNamespace: (namespace: string) =>
			admin.namespaces.describe(namespace),
		getTranslations: (namespace: string, locale: string) =>
			admin.namespaces.getTranslations(namespace, locale),
		updateTranslation: (
			namespace: string,
			locale: string,
			key: string,
			value: string,
		) => admin.namespaces.updateTranslation(namespace, locale, key, value),

		listPages: () => admin.pages.list(),
		getPage: (slug: string, locale: string, draft?: boolean) =>
			admin.pages.get(slug, locale, draft),
		updatePage: (id: string, blocks: unknown[]) =>
			admin.pages.update(id, blocks as RawBlock[]),
		publishPage: (id: string) => admin.pages.publish(id),

		presignMedia: (opts: {
			filename: string;
			mimeType: string;
			size: number;
		}) => admin.media.presign(opts),
	};
}
