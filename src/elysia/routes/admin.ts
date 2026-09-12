import { Elysia, t } from "elysia";
import { describeNamespace } from "../../admin/describe";
import {
	ALL_CMS_PERMISSIONS,
	CMS_PERMISSION_DESCRIPTIONS,
	CMS_PERMISSIONS,
	CMS_WILDCARD_PERMISSION,
} from "../../auth/permissions";
import type { CMSInstance } from "../../core/index";
import { requirePermission } from "../auth";

export function adminRoutes(cms: CMSInstance) {
	return new Elysia({ prefix: "/admin" })
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.ADMIN_READ] }))
		.get("/namespaces", async () => {
			return Promise.all(
				cms.namespaces.map(async (ns) => {
					const totalKeys = describeNamespace({ ns }).length;
					const meta = await cms.adapter.listNamespaceLocaleMeta({
						namespace: ns.name,
					});
					const updatedAt = meta.reduce<Date | null>(
						(latest, m) =>
							!latest || m.updatedAt > latest ? m.updatedAt : latest,
						null,
					);
					const coverage = Object.fromEntries(
						meta.map((m) => [
							m.locale,
							totalKeys === 0
								? 100
								: Math.round(
										(Math.min(m.keyCount, totalKeys) / totalKeys) * 100,
									),
						]),
					);
					return { name: ns.name, keyCount: totalKeys, updatedAt, coverage };
				}),
			);
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
		.get("/permissions", () => {
			return [
				...ALL_CMS_PERMISSIONS.map((value) => ({
					value,
					description: CMS_PERMISSION_DESCRIPTIONS[value],
				})),
				{
					value: CMS_WILDCARD_PERMISSION,
					description: "Grants every CMS permission",
				},
			];
		})
		.use(
			requirePermission({ cms, permissions: [CMS_PERMISSIONS.LOCALES_READ] }),
		)
		.get("/locales", () => cms.adapter.listLocales())
		.use(
			requirePermission({ cms, permissions: [CMS_PERMISSIONS.LOCALES_WRITE] }),
		)
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
		.use(
			requirePermission({ cms, permissions: [CMS_PERMISSIONS.LOCALES_DELETE] }),
		)
		.delete(
			"/locales/:code",
			async ({ params }) => {
				await cms.adapter.deleteLocale({ code: params.code });
				return { ok: true };
			},
			{
				params: t.Object({ code: t.String() }),
			},
		)
		.use(requirePermission({ cms, permissions: [CMS_PERMISSIONS.AUDIT_READ] }))
		.get(
			"/audit-log",
			({ query }) =>
				cms.adapter.listAuditLog({
					page: query.page ? Number(query.page) : 1,
					pageSize: query.pageSize ? Number(query.pageSize) : 20,
					targetType: query.targetType,
					targetId: query.targetId,
					actorId: query.actorId,
				}),
			{
				query: t.Object({
					page: t.Optional(t.String()),
					pageSize: t.Optional(t.String()),
					targetType: t.Optional(t.String()),
					targetId: t.Optional(t.String()),
					actorId: t.Optional(t.String()),
				}),
			},
		);
}
