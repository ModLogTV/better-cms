import type {
	CMSAdapter,
	Locale,
	Page,
	PageSummary,
	RawBlock,
} from "../core/adapter";

interface PrismaClient {
	translationNamespace: {
		findUnique(args: {
			where: { name_locale: { name: string; locale: string } };
		}): Promise<{ values: unknown } | null>;
		upsert(args: {
			where: { name_locale: { name: string; locale: string } };
			create: { name: string; locale: string; values: unknown };
			update: { values: unknown };
		}): Promise<unknown>;
	};
	page: {
		findUnique(args: {
			where: { slug_locale: { slug: string; locale: string } };
		}): Promise<{
			id: string;
			slug: string;
			locale: string;
			blocks: unknown;
			status: string;
			publishedAt: Date | null;
			updatedAt: Date;
		} | null>;
		upsert(args: {
			where: { id: string };
			create: { id: string; slug: string; locale: string; blocks: unknown };
			update: { blocks: unknown };
		}): Promise<unknown>;
		update(args: {
			where: { id: string };
			data: { status: string; publishedAt: Date };
		}): Promise<unknown>;
		findMany(): Promise<
			{
				id: string;
				slug: string;
				locale: string;
				status: string;
				updatedAt: Date;
			}[]
		>;
	};
	locale: {
		findMany(): Promise<
			{ code: string; name: string; isDefault: boolean; updatedAt: Date }[]
		>;
		upsert(args: {
			where: { code: string };
			create: { code: string; name: string; isDefault: boolean };
			update: { name?: string; isDefault?: boolean };
		}): Promise<unknown>;
		delete(args: { where: { code: string } }): Promise<unknown>;
	};
}

/**
 * Prisma adapter for better-cms.
 * Copy the schema snippet from the docs into your schema.prisma before generating.
 */
export function prismaAdapter(prisma: PrismaClient): CMSAdapter {
	return {
		async getTranslations(namespace, locale) {
			const row = await prisma.translationNamespace.findUnique({
				where: { name_locale: { name: namespace, locale } },
			});
			return (row?.values as Record<string, string> | undefined) ?? {};
		},

		async upsertTranslations(namespace, locale, values) {
			await prisma.translationNamespace.upsert({
				where: { name_locale: { name: namespace, locale } },
				create: { name: namespace, locale, values },
				update: { values },
			});
		},

		async getPage(slug, locale, draft) {
			const row = await prisma.page.findUnique({
				where: { slug_locale: { slug, locale } },
			});
			if (!row) return null;
			if (!draft && row.status !== "published") return null;
			return {
				id: row.id,
				slug: row.slug,
				locale: row.locale,
				blocks: row.blocks as RawBlock[],
				status: row.status as "draft" | "published",
				publishedAt: row.publishedAt,
				updatedAt: row.updatedAt,
			};
		},

		async upsertPage(id, blocks) {
			await prisma.page.upsert({
				where: { id },
				create: { id, slug: id, locale: "en", blocks },
				update: { blocks },
			});
		},

		async publishPage(id) {
			await prisma.page.update({
				where: { id },
				data: { status: "published", publishedAt: new Date() },
			});
		},

		async listPages() {
			const rows = await prisma.page.findMany();
			return rows.map(
				(r): PageSummary => ({
					id: r.id,
					slug: r.slug,
					locale: r.locale,
					status: r.status as "draft" | "published",
					updatedAt: r.updatedAt,
				}),
			);
		},

		async listLocales() {
			const rows = await prisma.locale.findMany();
			return rows.map(
				(r): Locale => ({
					code: r.code,
					name: r.name,
					isDefault: r.isDefault,
					updatedAt: r.updatedAt,
				}),
			);
		},

		async upsertLocale(code, name, isDefault = false) {
			await prisma.locale.upsert({
				where: { code },
				create: { code, name, isDefault },
				update: { name, isDefault },
			});
		},

		async deleteLocale(code) {
			await prisma.locale.delete({
				where: { code },
			});
		},
	};
}
