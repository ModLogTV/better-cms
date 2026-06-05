import { Elysia, t } from "elysia";
import { CMS_PERMISSIONS } from "../../auth/permissions";
import { describeNamespace } from "../../admin/describe";
import type { CMSInstance } from "../../core/index";
import { requirePermission } from "../auth";

export function adminRoutes(cms: CMSInstance) {
	return new Elysia({ prefix: "/admin" })
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.ADMIN_READ] }))
		.get("/namespaces", () => {
			return cms.namespaces.map((ns) => ({ name: ns.name }));
		})
		.get(
			"/namespaces/:namespace/describe",
			({ params, set }) => {
				const ns = cms.namespaces.find((n) => n.name === params.namespace);
				if (!ns) {
					set.status = 404;
					return { error: `Namespace not found: ${params.namespace}` };
				}
				return describeNamespace({ ns });
			},
			{
				params: t.Object({ namespace: t.String() }),
			},
		)
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.LOCALES_READ] }))
		.get("/locales", () => cms.adapter.listLocales())
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.LOCALES_WRITE] }))
		.put(
			"/locales",
			async ({ body }) => {
				await cms.adapter.upsertLocale({
					code: body.code,
					name: body.name,
					isDefault: body.isDefault,
				});
				return { ok: true };
			},
			{
				body: t.Object({
					code: t.String(),
					name: t.String(),
					isDefault: t.Optional(t.Boolean()),
				}),
			},
		)
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.LOCALES_DELETE] }))
		.delete(
			"/locales/:code",
			async ({ params }) => {
				await cms.adapter.deleteLocale({ code: params.code });
				return { ok: true };
			},
			{
				params: t.Object({ code: t.String() }),
			},
		);
}
