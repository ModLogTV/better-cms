import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import type { CMSInstance } from "../../core/index";
import { requirePermission } from "../auth";

const CACHE_HEADER = "s-maxage=60, stale-while-revalidate=300";

export function translationRoutes(cms: CMSInstance) {
	return new Elysia()
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.TRANSLATIONS_READ] }))
		.get(
			"/translations/:namespace/:locale",
			async ({ params, set }) => {
				set.headers["Cache-Control"] = CACHE_HEADER;
				return cms.adapter.getTranslations({
					namespace: params.namespace,
					locale: params.locale,
				});
			},
			{
				params: t.Object({ namespace: t.String(), locale: t.String() }),
			},
		)
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.TRANSLATIONS_WRITE] }))
		.put(
			"/translations/:namespace/:locale",
			async ({ params, body }) => {
				const known = cms.namespaces.map((ns) => ns.name);
				if (!known.includes(params.namespace)) {
					return { ok: false, error: `Unknown namespace: ${params.namespace}` };
				}
				await cms.adapter.upsertTranslations({
					namespace: params.namespace,
					locale: params.locale,
					values: body as Record<string, string>,
				});
				cms.events.emit("translations:updated", {
					namespace: params.namespace,
					locale: params.locale,
					values: body as Record<string, string>,
				});
				return { ok: true };
			},
			{
				params: t.Object({ namespace: t.String(), locale: t.String() }),
				body: t.Record(t.String(), t.String()),
			},
		);
}
