import { Elysia, t } from "elysia";
import { describeNamespace } from "../../admin/describe";
import type { CMSInstance } from "../../core/index";
import { requireFullToken, requireReadToken } from "../auth";

export function adminRoutes(cms: CMSInstance) {
	return new Elysia({ prefix: "/admin" })
		.use(requireReadToken(cms))
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
				return describeNamespace(ns);
			},
			{
				params: t.Object({ namespace: t.String() }),
			},
		)
		.get("/locales", () => cms.adapter.listLocales())
		.use(requireFullToken(cms))
		.put(
			"/locales",
			async ({ body }) => {
				await cms.adapter.upsertLocale(body.code, body.name, body.isDefault);
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
		.delete(
			"/locales/:code",
			async ({ params }) => {
				await cms.adapter.deleteLocale(params.code);
				return { ok: true };
			},
			{
				params: t.Object({ code: t.String() }),
			},
		);
}
