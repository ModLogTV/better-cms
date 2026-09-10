import type {
	CMSAdapter,
	Locale,
	MediaAsset,
	NamespaceLocaleMeta,
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
		findMany(args: {
			where: { name: string };
		}): Promise<{ locale: string; updatedAt: Date; values: unknown }[]>;
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
		create(args: {
			data: { id: string; slug: string; locale: string; blocks: unknown };
		}): Promise<{
			id: string;
			slug: string;
			locale: string;
			blocks: unknown;
			status: string;
			publishedAt: Date | null;
			updatedAt: Date;
		}>;
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
		updateMany(args: {
			where: { code: { not: string } };
			data: { isDefault: boolean };
		}): Promise<unknown>;
		delete(args: { where: { code: string } }): Promise<unknown>;
	};
	mediaAsset: {
		create(args: {
			data: {
				id: string;
				key: string;
				filename: string;
				mimeType: string;
				size: number;
				publicUrl: string;
				uploadedBy?: string;
				confirmedAt: Date | null;
			};
		}): Promise<{
			id: string;
			key: string;
			filename: string;
			mimeType: string;
			size: number;
			publicUrl: string;
			uploadedBy: string | null;
			confirmedAt: Date | null;
			createdAt: Date;
		}>;
		update(args: {
			where: { id: string };
			data: { confirmedAt: Date };
		}): Promise<unknown>;
		findMany(): Promise<
			{
				id: string;
				key: string;
				filename: string;
				mimeType: string;
				size: number;
				publicUrl: string;
				uploadedBy: string | null;
				confirmedAt: Date | null;
				createdAt: Date;
			}[]
		>;
		deleteMany(args: { where: { key: string } }): Promise<unknown>;
	};
}

/**
 * Prisma adapter for better-cms.
 * Copy the schema snippet from the docs into your schema.prisma before generating.
 */
export function prismaAdapter(prisma: PrismaClient): CMSAdapter {
	return {
		async getTranslations({ namespace, locale }) {
			const row = await prisma.translationNamespace.findUnique({
				where: { name_locale: { name: namespace, locale } },
			});
			return (row?.values as Record<string, string> | undefined) ?? {};
		},

		async upsertTranslations({ namespace, locale, values }) {
			await prisma.translationNamespace.upsert({
				where: { name_locale: { name: namespace, locale } },
				create: { name: namespace, locale, values },
				update: { values },
			});
		},

		async listNamespaceLocaleMeta({ namespace }) {
			const rows = await prisma.translationNamespace.findMany({
				where: { name: namespace },
			});
			return rows.map(
				(r): NamespaceLocaleMeta => ({
					locale: r.locale,
					updatedAt: r.updatedAt,
					keyCount: Object.keys((r.values as Record<string, string>) ?? {})
						.length,
				}),
			);
		},

		async getPage({ slug, locale, draft }) {
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

		async upsertPage({ id, blocks }) {
			await prisma.page.upsert({
				where: { id },
				create: { id, slug: id, locale: "en", blocks },
				update: { blocks },
			});
		},

		async createPage({ id, slug, locale }) {
			const row = await prisma.page.create({
				data: { id, slug, locale, blocks: [] },
			});
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

		async publishPage({ id }) {
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

		async upsertLocale({ code, name, isDefault = false }) {
			// Only one locale may be default - docs/getting-started/database-schema.md
			// already documented this as unenforced; enforce it here instead of
			// leaving it as a silent data-integrity trap for admin UI callers.
			if (isDefault) {
				await prisma.locale.updateMany({
					where: { code: { not: code } },
					data: { isDefault: false },
				});
			}
			await prisma.locale.upsert({
				where: { code },
				create: { code, name, isDefault },
				update: { name, isDefault },
			});
		},

		async deleteLocale({ code }) {
			await prisma.locale.delete({
				where: { code },
			});
		},

		async createMediaAsset({
			id,
			key,
			filename,
			mimeType,
			size,
			publicUrl,
			uploadedBy,
		}) {
			const row = await prisma.mediaAsset.create({
				data: {
					id,
					key,
					filename,
					mimeType,
					size,
					publicUrl,
					uploadedBy,
					confirmedAt: null,
				},
			});
			return {
				id: row.id,
				key: row.key,
				filename: row.filename,
				mimeType: row.mimeType,
				size: row.size,
				publicUrl: row.publicUrl,
				uploadedBy: row.uploadedBy ?? undefined,
				confirmedAt: row.confirmedAt,
				createdAt: row.createdAt,
			};
		},

		async confirmMediaAsset({ id }) {
			await prisma.mediaAsset.update({
				where: { id },
				data: { confirmedAt: new Date() },
			});
		},

		async listMediaAssets() {
			const rows = await prisma.mediaAsset.findMany();
			return rows.map(
				(r): MediaAsset => ({
					id: r.id,
					key: r.key,
					filename: r.filename,
					mimeType: r.mimeType,
					size: r.size,
					publicUrl: r.publicUrl,
					uploadedBy: r.uploadedBy ?? undefined,
					confirmedAt: r.confirmedAt,
					createdAt: r.createdAt,
				}),
			);
		},

		async deleteMediaAsset({ key }) {
			await prisma.mediaAsset.deleteMany({ where: { key } });
		},
	};
}
